import { Router, Request, Response } from 'express';
import { authenticate, requireUserType } from '../middleware/auth';
import { createHdfcOrder, handleHdfcReturn, handleHdfcCancel } from '../services/paymentService';
import Order from '../models/Order';
import Payment from '../models/Payment';
import AppSettings from '../models/AppSettings';
import { fetchHdfcTransactionStatus } from '../services/hdfcStatusApi';
import { createCashfreeOrder, verifyCashfreePayment } from '../services/cashfreeService';

const router = Router();

/**
 * Create HDFC order for payment.
 * Generates the encrypted string and HDFC credentials needed for the frontend auto-submit form.
 */
router.post('/create-order', authenticate, requireUserType('Customer'), async (req: Request, res: Response) => {
    try {
        const { orderId, gateway } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required',
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Verify order belongs to customer
        if (order.customer.toString() !== req.user!.userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to order',
            });
        }

        // BACKEND_URL may already include /api/v1 on the server (e.g. https://api.mandibazar.in/api/v1)
        // So we strip any trailing /api/v1 from it before appending our path to avoid doubling.
        const rawBackendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const backendBase = rawBackendUrl.replace(/\/api\/v1\/?$/, '');

        // Fetch settings to determine active gateway
        const settings = await AppSettings.getSettings();
        const activeGateway = gateway || settings.activePaymentGateway || 'HDFC';

        if (activeGateway === 'CASHFREE') {
            const redirectUrl = `${backendBase}/api/v1/payment/cashfree-return`;
            
            // Clean phone number: remove non-digits and take last 10
            let customerPhone = '9999999999';
            if (order.customerPhone) {
                const cleaned = order.customerPhone.toString().replace(/\D/g, '');
                if (cleaned.length >= 10) {
                    customerPhone = cleaned.slice(-10);
                }
            } else {
                // Fallback if denormalized phone is missing
                const customerObj: any = order.customer;
                if (customerObj && customerObj.phone) {
                    const cleaned = customerObj.phone.toString().replace(/\D/g, '');
                    if (cleaned.length >= 10) {
                        customerPhone = cleaned.slice(-10);
                    }
                }
            }

            const customerEmail = order.customerEmail || 'info@mandibazaar.com';
            const customerName = order.customerName || 'Customer';
            
            console.log(`Initialising Cashfree Order: ${orderId} for customer: ${customerPhone}`);

            const result = await createCashfreeOrder(orderId, order.total, redirectUrl, {
                 customer_id: order.customer.toString(),
                 customer_phone: customerPhone,
                 customer_email: customerEmail,
                 customer_name: customerName
            });

            if (!result.success) {
                console.error('Cashfree Order Creation Failed:', result);
                return res.status(400).json(result);
            }
            return res.status(200).json({ ...result, provider: 'CASHFREE' });
        } else {
            // HDFC Flow
            const redirectUrl = `${backendBase}/api/v1/payment/hdfc-return`;
            const cancelUrl = `${backendBase}/api/v1/payment/hdfc-cancel`;

            const result = await createHdfcOrder(orderId, order.total, redirectUrl, cancelUrl);

            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json({ ...result, provider: 'HDFC' });
        }
    } catch (error: any) {
        console.error('Error creating payment order:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create payment order',
        });
    }
});

/**
 * Manual status sync (Dual Enquiry) for pending orders.
 * Useful when realtime return/callback was missed or Dual Enquiry failed earlier.
 */
router.post('/hdfc-sync/:orderId', authenticate, requireUserType('Customer'), async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.customer.toString() !== req.user!.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to order' });
        }

        const dualEnquiry = await fetchHdfcTransactionStatus(orderId);
        if (!dualEnquiry.success || !dualEnquiry.data) {
            return res.status(400).json({ success: false, message: dualEnquiry.message || 'Dual enquiry failed' });
        }

        const verifiedStatusRaw = dualEnquiry.data.order_status;
        const verifiedStatus =
            typeof verifiedStatusRaw === 'string' ? verifiedStatusRaw.trim() : String(verifiedStatusRaw ?? '');
        const isSuccessfulPayment = (() => {
            const s = verifiedStatus.toLowerCase();
            return s === 'successful' || s === 'success' || s === 'paid';
        })();

        // If already paid/refunded, just return current order
        if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Refunded') {
            return res.status(200).json({ success: true, message: 'Order already processed', data: order });
        }

        // Create a payment record if missing (idempotent-ish via order+gatewayResponse)
        if (isSuccessfulPayment) {
            const paymentRecord = new Payment({
                order: orderId,
                customer: order.customer,
                paymentMethod: order.paymentMethod || 'Online',
                paymentGateway: 'HDFC',
                amount: dualEnquiry.data.order_amt,
                currency: 'INR',
                status: 'Completed',
                paidAt: new Date(),
                gatewayResponse: {
                    success: true,
                    message: verifiedStatus,
                    rawResponse: { dualEnquiryStatus: dualEnquiry.data },
                },
            });

            try {
                await paymentRecord.save();
                order.paymentId = paymentRecord._id.toString();
            } catch {
                // Ignore duplicate/unique conflicts, continue updating order
            }

            order.paymentStatus = 'Paid';
            if (order.status === 'Pending') order.status = 'Received';
            await order.save();

            return res.status(200).json({ success: true, message: 'Order synced as paid', data: order });
        }

        // Non-success status → if still pending, keep it pending; otherwise mark failed.
        if (['failed', 'failure', 'unsuccessful', 'cancelled', 'aborted', 'timeout', 'fraud'].includes(verifiedStatus.toLowerCase())) {
            order.paymentStatus = 'Failed';
            await order.save();
        }

        return res.status(200).json({
            success: true,
            message: `Order status synced: ${verifiedStatus}`,
            data: order,
            gatewayStatus: dualEnquiry.data,
        });
    } catch (error: any) {
        console.error('Error syncing HDFC status:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to sync status' });
    }
});

/**
 * HDFC Return Webhook / Redirect Endpoint
 * HDFC securely POSTs the transaction result here.
 * This endpoint processes the payload, performs Security Validations (Dual Enquiry), 
 * and redirects the user's browser back to the frontend application.
 */
router.post('/hdfc-return', async (req: Request, res: Response) => {
    try {
        const encResp =
            req.body.encResp ||
            req.body.enc_resp ||
            req.body.encResponse ||
            req.query.encResp ||
            req.query.enc_resp ||
            req.query.encResponse;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!encResp) {
            console.error('Missing encResp in HDFC Return');
            return res.redirect(`${frontendUrl}/orders?error=missing_payment_response`);
        }

        const result = await handleHdfcReturn(encResp, req.app.get('io'));

        if (result.success) {
            return res.redirect(`${frontendUrl}/orders/${result.orderId}?payment=success`);
        } else {
            return res.redirect(`${frontendUrl}/orders/${result.orderId || ''}?error=${encodeURIComponent(result.message || 'Payment failed')}`);
        }
    } catch (error: any) {
        console.error('Error handling HDFC return route:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/orders?error=system_error`);
    }
});

// Some gateway flows can redirect via GET. Support it too.
router.get('/hdfc-return', async (req: Request, res: Response) => {
    try {
        const encResp =
            (req.query.encResp as string | undefined) ||
            (req.query.enc_resp as string | undefined) ||
            (req.query.encResponse as string | undefined);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!encResp) {
            console.error('Missing encResp in HDFC Return (GET)');
            return res.redirect(`${frontendUrl}/orders?error=missing_payment_response`);
        }

        const result = await handleHdfcReturn(encResp, req.app.get('io'));

        if (result.success) {
            return res.redirect(`${frontendUrl}/orders/${result.orderId}?payment=success`);
        } else {
            return res.redirect(`${frontendUrl}/orders/${result.orderId || ''}?error=${encodeURIComponent(result.message || 'Payment failed')}`);
        }
    } catch (error: any) {
        console.error('Error handling HDFC return route (GET):', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/orders?error=system_error`);
    }
});

/**
 * HDFC Cancel Webhook / Redirect Endpoint
 * User cancelled the transaction from HDFC billing page.
 */
router.post('/hdfc-cancel', async (req: Request, res: Response) => {
    try {
        const encResp =
            req.body.encResp ||
            req.body.enc_resp ||
            req.body.encResponse ||
            req.query.encResp ||
            req.query.enc_resp ||
            req.query.encResponse;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (encResp) {
            await handleHdfcCancel(encResp);
        }
        
        return res.redirect(`${frontendUrl}/cart?error=payment_cancelled`);
    } catch (error: any) {
        console.error('Error handling HDFC cancel route:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/cart?error=cancel_error`);
    }
});

router.get('/hdfc-cancel', async (req: Request, res: Response) => {
    try {
        const encResp =
            (req.query.encResp as string | undefined) ||
            (req.query.enc_resp as string | undefined) ||
            (req.query.encResponse as string | undefined);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (encResp) {
            await handleHdfcCancel(encResp);
        }

        return res.redirect(`${frontendUrl}/cart?error=payment_cancelled`);
    } catch (error: any) {
        console.error('Error handling HDFC cancel route (GET):', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/cart?error=cancel_error`);
    }
});

export default router;

/**
 * Cashfree Return Webhook / Redirect Endpoint
 */
router.get('/cashfree-return', async (req: Request, res: Response) => {
    try {
        const orderId = req.query.order_id as string;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!orderId) {
            console.error('Missing order_id in Cashfree Return');
            return res.redirect(`${frontendUrl}/orders?error=missing_payment_response`);
        }

        const result = await verifyCashfreePayment(orderId);

        if (result.success && result.data?.order_status === 'PAID') {
            const order = await Order.findById(orderId);
            if (order && order.paymentStatus !== 'Paid') {
                const paymentRecord = new Payment({
                    order: orderId,
                    customer: order.customer,
                    paymentMethod: 'Online',
                    paymentGateway: 'CASHFREE',
                    amount: result.data.order_amount,
                    currency: 'INR',
                    status: 'Completed',
                    paidAt: new Date(),
                    gatewayResponse: {
                        success: true,
                        message: 'Payment verified via Return redirect',
                        rawResponse: result.data,
                    },
                });

                await paymentRecord.save();
                order.paymentStatus = 'Paid';
                order.paymentId = paymentRecord._id.toString();
                if (order.status === 'Pending') order.status = 'Received';
                await order.save();

                // Create Pending Commissions 
                try {
                    const { createPendingCommissions } = await import('../services/commissionService');
                    await createPendingCommissions(orderId);
                } catch (commError) {
                    console.error("Failed to create pending commissions after payment:", commError);
                }

                // TRIGGER NOTIFICATIONS FOR SELLERS
                const io = req.app.get('io');
                if (io) {
                    try {
                        const { notifySellersOfOrderUpdate } = await import('../services/sellerNotificationService');
                        const { sendSellerNewOrderNotification, sendCustomerOrderNotification } = await import('../services/notificationService');
                        const savedOrder: any = await Order.findById(order._id).populate('items').lean();
                        if (savedOrder) {
                            await notifySellersOfOrderUpdate(io, savedOrder, 'NEW_ORDER');
                            
                            const sellerIds = new Set<string>();
                            (savedOrder.items as any[]).forEach(item => {
                                if (item.seller) sellerIds.add(item.seller.toString());
                            });
    
                            for (const sellerId of sellerIds) {
                                try {
                                    await sendSellerNewOrderNotification(sellerId, savedOrder._id.toString(), savedOrder.orderNumber, savedOrder.total);
                                } catch (notifyError) {}
                            }
    
                            try {
                                await sendCustomerOrderNotification(savedOrder._id.toString(), savedOrder.orderNumber, savedOrder.customer.toString(), savedOrder.total, 'Processed');
                            } catch (notifyError) {}
                        }
                    } catch (notifyError) {
                        console.error("Error triggering notifications after payment:", notifyError);
                    }
                }
            }

            return res.redirect(`${frontendUrl}/orders/${orderId}?payment=success`);
        } else {
            // Failed
            const order = await Order.findById(orderId);
            if (order && order.paymentStatus === 'Pending') {
                order.paymentStatus = 'Failed';
                await order.save();
            }
            return res.redirect(`${frontendUrl}/orders/${orderId}?error=Payment failed or pending`);
        }
    } catch (error: any) {
        console.error('Error handling Cashfree return route:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/orders?error=system_error`);
    }
});
