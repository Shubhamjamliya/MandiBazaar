import { Router, Request, Response } from 'express';
import { authenticate, requireUserType } from '../middleware/auth';
import { createHdfcOrder, handleHdfcReturn, handleHdfcCancel } from '../services/paymentService';
import Order from '../models/Order';

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

        const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const redirectUrl = `${backendUrl}/api/v1/payment/hdfc-return`;
        const cancelUrl = `${backendUrl}/api/v1/payment/hdfc-cancel`;

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
 * HDFC Return Webhook / Redirect Endpoint
 * HDFC securely POSTs the transaction result here.
 * This endpoint processes the payload, performs Security Validations (Dual Enquiry), 
 * and redirects the user's browser back to the frontend application.
 */
router.post('/hdfc-return', async (req: Request, res: Response) => {
    try {
        const encResp = req.body.encResp || req.body.enc_resp || req.body.encResponse;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!encResp) {
            console.error('Missing encResp in HDFC Return');
            return res.redirect(`${frontendUrl}/orders?error=missing_payment_response`);
        }

        const result = await handleHdfcReturn(encResp);

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

/**
 * HDFC Cancel Webhook / Redirect Endpoint
 * User cancelled the transaction from HDFC billing page.
 */
router.post('/hdfc-cancel', async (req: Request, res: Response) => {
    try {
        const encResp = req.body.encResp || req.body.enc_resp || req.body.encResponse;
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

export default router;
