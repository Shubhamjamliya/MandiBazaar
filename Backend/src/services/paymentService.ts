import Payment from '../models/Payment';
import Order from '../models/Order';
import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/hdfcCrypto';
import { fetchHdfcTransactionStatus } from './hdfcStatusApi';
import url from 'url';

/**
 * Create an HDFC order / generate encrypted payload
 */
export const createHdfcOrder = async (
    orderId: string,
    amount: number,
    redirectUrl: string,
    cancelUrl: string,
    currency: string = 'INR'
) => {
    try {
        const merchantId = process.env.HDFC_MERCHANT_ID;
        const accessCode = process.env.HDFC_ACCESS_CODE;
        const workingKey = process.env.HDFC_WORKING_KEY;
        const gatewayUrl = process.env.HDFC_GATEWAY_URL;

        console.log('DEBUG HDFC ENV:', { 
            merchantId: merchantId ? 'Present' : 'Missing',
            accessCode: accessCode ? 'Present' : 'Missing',
            workingKey: workingKey ? 'Present' : 'Missing',
            gatewayUrl: gatewayUrl ? 'Present' : 'Missing'
        });

        if (!merchantId || !accessCode || !workingKey || !gatewayUrl) {
            throw new Error('HDFC credentials not configured (HDFC_MERCHANT_ID, HDFC_ACCESS_CODE, HDFC_WORKING_KEY, HDFC_GATEWAY_URL)');
        }

        const requestParams = new url.URLSearchParams({
            merchant_id: merchantId,
            order_id: orderId,
            currency: currency,
            amount: amount.toString(),
            redirect_url: redirectUrl,
            cancel_url: cancelUrl,
            language: 'EN'
        });

        // Generate encrypted request
        const encRequest = encrypt(requestParams.toString(), workingKey);

        return {
            success: true,
            data: {
                encRequest,
                accessCode,
                gatewayUrl: `${gatewayUrl}/transaction/transaction.do?command=initiateTransaction`
            }
        };
    } catch (error: any) {
        console.error('Error creating HDFC order:', error);
        return {
            success: false,
            message: error.message || 'Failed to create HDFC payload'
        };
    }
};

/**
 * Handle HDFC Return (Decrypt response, validate security audit rules, capture payment)
 */
export const handleHdfcReturn = async (
    encResp: string,
    io?: any // SocketIOServer
) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const workingKey = process.env.HDFC_WORKING_KEY;
        if (!workingKey) {
            throw new Error('HDFC_WORKING_KEY not configured');
        }

        // Decrypt response
        const decryptedResponse = decrypt(encResp, workingKey);
        
        // Response string is format like: order_id=123&tracking_id=456&bank_ref_no=789...
        const responseParams = new url.URLSearchParams(decryptedResponse);
        
        const orderId = responseParams.get('order_id');
        const trackingId = responseParams.get('tracking_id'); // HDFC payment/tracking ID
        const bankRefNo = responseParams.get('bank_ref_no');
        const orderStatus = responseParams.get('order_status');
        const amountStr = responseParams.get('amount');
        const paymentMode = responseParams.get('payment_mode');
        
        const failureMessage = responseParams.get('failure_message');
        const statusMessage = responseParams.get('status_message');

        if (!orderId || !trackingId || !orderStatus) {
            throw new Error('Missing required parameters in decrypted response');
        }

        // SECURITY AUDIT CHECK 1: Ensure order exists
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            throw new Error('Order not found for the returned order_id');
        }

        // SECURITY AUDIT CHECK 2: Duplicate Entry Validation
        // If order payment status is already Paid or Refunded, return success with existing info
        if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Refunded') {
             // Order is already processed (e.g. Status API webhook beat this return step)
             await session.abortTransaction();
             session.endSession();
             return {
                 success: orderStatus === 'Success', // if it was already processed, just rely on what DB says (which is successful)
                 message: 'Order was already processed successfully',
                 orderId: order._id,
                 status: 'Duplicate'
             };
        }

        // SECURITY AUDIT CHECK 3: Dual Enquiry Data Validation via Status API
        // Always fetch truth from server instead of trusting the return payload amounts
        console.log(`Triggering Dual Enquiry for Order: ${orderId}`);
        const dualEnquiry = await fetchHdfcTransactionStatus(orderId);
        
        if (!dualEnquiry.success || !dualEnquiry.data) {
             throw new Error(`Dual enquiry failed: ${dualEnquiry.message}`);
        }

        const verifiedStatus = dualEnquiry.data.order_status;
        const verifiedAmount = dualEnquiry.data.order_amt;

        // Compare amounts (tampering check)
        if (verifiedStatus === 'Successful') {
            const dbTotalAmount = order.total; // Stored expected amount
            
            // Allow small rounding differences if any, but exact match is preferred
            if (verifiedAmount !== dbTotalAmount) {
                // Potential Tampering Detected!
                console.error(`Amount tampering detected! DB has ${dbTotalAmount}, HDFC reported ${verifiedAmount}`);
                // Proceed to mark payment as failed/fraud
                order.paymentStatus = 'Failed'; // or 'Fraud' if your model supports it
                await order.save({ session });
                await session.commitTransaction();
                return {
                    success: false,
                    message: `Amount Validation Failed. Order tampered.`,
                    orderId: order._id,
                    status: 'Fraud'
                };
            }
        }

        // Create/Update Payment record based on definitively verified data
        const paymentRecord = new Payment({
            order: orderId,
            customer: order.customer,
            paymentMethod: paymentMode || 'Online',
            paymentGateway: 'HDFC',
            razorpayOrderId: trackingId, // Using razorpayOrderId field for HDFC trackingId to minimize schema changes
            razorpayPaymentId: bankRefNo || 'N/A', // Using razorpayPaymentId field for HDFC bank_ref_no
            razorpaySignature: 'HDFC_ENCRYPTED_SIGNATURE', // Placeholder since HDFC uses encryption instead of signature
            amount: verifiedAmount || parseFloat(amountStr || '0'),
            currency: 'INR',
            status: verifiedStatus === 'Successful' ? 'Completed' : 'Failed',
            paidAt: verifiedStatus === 'Successful' ? new Date() : undefined,
            gatewayResponse: {
                success: verifiedStatus === 'Successful',
                message: statusMessage || failureMessage || verifiedStatus,
                rawResponse: {
                    decryptedParams: decryptedResponse,
                    dualEnquiryStatus: dualEnquiry.data
                }
            },
        });

        await paymentRecord.save({ session });

        if (verifiedStatus === 'Successful') {
            order.paymentStatus = 'Paid';
            order.paymentId = paymentRecord._id.toString();
            // Change order status from 'Pending' to 'Received' after successful payment
            if (order.status === 'Pending') {
                order.status = 'Received';
            }
            await order.save({ session });
            await session.commitTransaction();

            // Create Pending Commissions 
            try {
                const { createPendingCommissions } = await import('./commissionService');
                await createPendingCommissions(orderId);
            } catch (commError) {
                console.error("Failed to create pending commissions after payment:", commError);
            }

            // TRIGGER NOTIFICATIONS FOR SELLERS (Delayed until payment success)
            if (io) {
                try {
                    const { notifySellersOfOrderUpdate } = await import('./sellerNotificationService');
                    const { sendSellerNewOrderNotification, sendCustomerOrderNotification } = await import('./notificationService');
                    
                    // Fetch full order with items for notification
                    const savedOrder: any = await Order.findById(order._id).populate('items').lean();
                    
                    if (savedOrder) {
                        // Real-time seller notification (Socket)
                        await notifySellersOfOrderUpdate(io, savedOrder, 'NEW_ORDER');

                        // Push notifications to sellers
                        const sellerIds = new Set<string>();
                        (savedOrder.items as any[]).forEach(item => {
                            if (item.seller) sellerIds.add(item.seller.toString());
                        });

                        for (const sellerId of sellerIds) {
                            try {
                                await sendSellerNewOrderNotification(sellerId, savedOrder._id.toString(), savedOrder.orderNumber, savedOrder.total);
                            } catch (notifyError) {
                                console.error(`Error sending push notification to seller ${sellerId}:`, notifyError);
                            }
                        }

                        // Push notification to customer (Order Confirmed)
                        try {
                            await sendCustomerOrderNotification(
                                savedOrder._id.toString(),
                                savedOrder.orderNumber,
                                savedOrder.customer.toString(),
                                savedOrder.total,
                                'Processed'
                            );
                        } catch (notifyError) {
                            console.error("Error sending order confirmation notification to customer:", notifyError);
                        }
                    }
                } catch (notifyError) {
                    console.error("Error triggering notifications after payment:", notifyError);
                }
            }

            return {
                success: true,
                message: 'Payment captured successfully',
                orderId: order._id,
                status: 'Success'
            };
        } else {
            // Failed, Aborted, or Cancelled transaction
            order.paymentStatus = 'Failed';
            await order.save({ session });
            await session.commitTransaction();

            return {
                success: false,
                message: `Payment not successful: ${verifiedStatus} - ${statusMessage || ''}`,
                orderId: order._id,
                status: verifiedStatus // e.g., 'Aborted', 'Failure'
            };
        }

    } catch (error: any) {
        await session.abortTransaction();
        console.error('Error handling HDFC return:', error);
        return {
            success: false,
            message: error.message || 'Failed to process HDFC payment return',
            status: 'Error'
        };
    } finally {
        session.endSession();
    }
};

/**
 * Handle HDFC Cancel
 */
export const handleHdfcCancel = async (encResp: string) => {
    // Similar to return but expecting cancelled/aborted status
    try {
        const workingKey = process.env.HDFC_WORKING_KEY;
        if (!workingKey) {
            throw new Error('HDFC_WORKING_KEY not configured');
        }
        const decryptedResponse = decrypt(encResp, workingKey);
        const responseParams = new url.URLSearchParams(decryptedResponse);
        const orderId = responseParams.get('order_id');
        const orderStatus = responseParams.get('order_status'); // likely 'Aborted'
        
        if (orderId) {
            const order = await Order.findById(orderId);
            if (order && order.paymentStatus === 'Pending') {
                order.paymentStatus = 'Failed';
                // Can track abort reason here if desired
                await order.save();
            }
        }

        return {
            success: false,
            message: 'Payment cancelled by user',
            orderId: orderId,
            status: orderStatus
        };
    } catch (error) {
        console.error("Failed handling cancel request", error);
        return { success: false, message: "Error parsing cancellation", status: 'Error' };
    }
};

/**
 * Process refund (Placeholder for HDFC API refund logic, HDFC refunds usually done via dashboard unless refund API is integrated)
 */
export const processRefund = async (
    paymentId: string,
    amount?: number,
    reason?: string
) => {
    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        // Wait for HDFC Refund API Details. Currently we must manually refund from CCavenue Dashboard
        // Update DB assuming manual refund triggered:
        
        const refundAmount = amount || payment.amount;

        payment.status = 'Refunded';
        payment.refundAmount = refundAmount;
        payment.refundedAt = new Date();
        payment.refundReason = reason || 'Manual refund via dashboard';
        await payment.save();

        return {
            success: true,
            message: 'Refund recorded in system (Manual action needed in HDFC dashboard)',
            data: {
                refundId: 'N/A',
                amount: refundAmount,
            },
        };
    } catch (error: any) {
        console.error('Error processing refund:', error);
        return {
            success: false,
            message: error.message || 'Failed to process refund',
        };
    }
};

/**
 * Razorpay Order Creation (Legacy/Placeholder for build)
 */
export const createRazorpayOrder = async (_orderId: string, _amount: number) => {
    return {
        success: false,
        message: "Razorpay is disabled. Please use HDFC Gateway."
    };
};

/**
 * Razorpay Signature Verification (Legacy/Placeholder for build)
 */
export const verifyPaymentSignature = (_orderId: string, _paymentId: string, _signature: string) => {
    return false;
};
