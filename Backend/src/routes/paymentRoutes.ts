import { Router, Request, Response } from 'express';
import { authenticate, requireUserType } from '../middleware/auth';
import { createHdfcOrder, handleHdfcReturn, handleHdfcCancel } from '../services/paymentService';
import Order from '../models/Order';
import Payment from '../models/Payment';
import { fetchHdfcTransactionStatus } from '../services/hdfcStatusApi';

const router = Router();

/**
 * Create HDFC order for payment.
 * Generates the encrypted string and HDFC credentials needed for the frontend auto-submit form.
 */
router.post('/create-order', authenticate, requireUserType('Customer'), async (req: Request, res: Response) => {
    try {
        const { orderId } = req.body;

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
        const redirectUrl = `${backendBase}/api/v1/payment/hdfc-return`;
        const cancelUrl = `${backendBase}/api/v1/payment/hdfc-cancel`;

        const result = await createHdfcOrder(orderId, order.total, redirectUrl, cancelUrl);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error creating HDFC order:', error);
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
