import { Request, Response } from 'express';
import {
    getWalletBalance,
    getWalletTransactions,
    createWithdrawalRequest,
    getWithdrawalRequests,
} from '../../../services/walletManagementService';
import { getCommissionSummary } from '../../../services/commissionService';
import Delivery from '../../../models/Delivery';
import AppSettings from '../../../models/AppSettings';
import CashCollection from '../../../models/CashCollection';
import { createHdfcOrder } from '../../../services/paymentService';
import { decrypt } from '../../../utils/hdfcCrypto';
import { fetchHdfcTransactionStatus } from '../../../services/hdfcStatusApi';
import url from 'url';

/**
 * Get delivery boy wallet balance
 */
export const getBalance = async (req: Request, res: Response) => {
    try {
        const deliveryBoyId = req.user!.userId;
        const balance = await getWalletBalance(deliveryBoyId, 'DELIVERY_BOY');

        const deliveryBoy = await Delivery.findById(deliveryBoyId);
        const settings = await AppSettings.findOne();

        const defaultCashLimit = settings?.defaultCashLimit ?? 2000;
        const cashLimit = deliveryBoy?.cashLimit ?? defaultCashLimit;
        const cashCollected = deliveryBoy?.cashCollected ?? 0;

        return res.status(200).json({
            success: true,
            data: {
                balance,
                cashCollected,
                cashLimit,
                profile: {
                    name: deliveryBoy?.name,
                    mobile: deliveryBoy?.mobile,
                    email: deliveryBoy?.email
                }
            },
        });
    } catch (error: any) {
        console.error('Error getting wallet balance:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get wallet balance',
        });
    }
};

/**
 * Get delivery boy wallet transactions
 */
export const getTransactions = async (req: Request, res: Response) => {
    try {
        const deliveryBoyId = req.user!.userId;
        const { page = 1, limit = 20 } = req.query;

        const result = await getWalletTransactions(
            deliveryBoyId,
            'DELIVERY_BOY',
            Number(page),
            Number(limit)
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error getting wallet transactions:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get wallet transactions',
        });
    }
};

/**
 * Request withdrawal
 */
export const requestWithdrawal = async (req: Request, res: Response) => {
    try {
        const deliveryBoyId = req.user!.userId;
        const { amount, paymentMethod } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid withdrawal amount',
            });
        }

        if (!paymentMethod || !['Bank Transfer', 'UPI'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method',
            });
        }

        const result = await createWithdrawalRequest(
            deliveryBoyId,
            'DELIVERY_BOY',
            amount,
            paymentMethod
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json(result);
    } catch (error: any) {
        console.error('Error requesting withdrawal:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to request withdrawal',
        });
    }
};

/**
 * Get delivery boy withdrawal requests
 */
export const getWithdrawals = async (req: Request, res: Response) => {
    try {
        const deliveryBoyId = req.user!.userId;
        const { status } = req.query;

        const result = await getWithdrawalRequests(
            deliveryBoyId,
            'DELIVERY_BOY',
            status as string
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error getting withdrawal requests:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get withdrawal requests',
        });
    }
};

/**
 * Get delivery boy commission earnings
 */
export const getCommissions = async (req: Request, res: Response) => {
    try {
        const deliveryBoyId = req.user!.userId;

        const result = await getCommissionSummary(deliveryBoyId, 'DELIVERY_BOY');

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error getting commission earnings:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get commission earnings',
        });
    }
};

/**
 * Create an HDFC order for cash settlement
 */
export const createSettleCashOrder = async (req: Request, res: Response) => {
    try {
        const deliveryBoyId = req.user!.userId;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount." });
        }

        const deliveryBoy = await Delivery.findById(deliveryBoyId);
        if (!deliveryBoy) {
            return res.status(404).json({ success: false, message: "Delivery boy not found." });
        }

        // Generate a unique settlement ID
        const settlementId = `SETTLE_${Date.now()}`;

        // Redirect and Cancel URLs
        const rawBackendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const backendBase = rawBackendUrl.replace(/\/api\/v1\/?$/, '');
        const redirectUrl = `${backendBase}/api/v1/delivery/wallet/settle-cash/return`;
        const cancelUrl = `${backendBase}/api/v1/delivery/wallet/settle-cash/cancel`;

        const result = await createHdfcOrder(settlementId, amount, redirectUrl, cancelUrl, 'INR', {
            merchant_param1: deliveryBoyId
        });

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error creating settlement order:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to initiate settlement',
        });
    }
};

/**
 * Handle HDFC settlement payment return
 */
export const hdfcSettleCashReturn = async (req: Request, res: Response) => {
    try {
        const encResp = req.body.encResp || req.body.enc_resp || req.body.encResponse;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const workingKey = process.env.HDFC_WORKING_KEY;

        if (!encResp || !workingKey) {
            console.error('Missing response or working key in HDFC settlement return');
            return res.redirect(`${frontendUrl}/delivery/wallet?error=missing_config`);
        }

        // Decrypt and process
        const decrypted = decrypt(encResp, workingKey);
        const params = new url.URLSearchParams(decrypted);

        const settlementId = params.get('order_id');
        const trackingId = params.get('tracking_id');
        const orderStatus = params.get('order_status');
        const amountStr = params.get('amount');
        const amount = parseFloat(amountStr || '0');

        if (orderStatus !== 'Success' && orderStatus !== 'Successful' && orderStatus !== 'Successfull') {
            console.warn(`Settlement payment failed: ${orderStatus}`);
            return res.redirect(`${frontendUrl}/delivery/wallet?error=payment_failed`);
        }

        // Dual Enquiry Security Check
        const statusCheck = await fetchHdfcTransactionStatus(settlementId!);
        if (!statusCheck.success || statusCheck.data?.order_status !== 'Successful') {
            console.error('HDFC status check failed or status mismatch for settlement', settlementId);
            return res.redirect(`${frontendUrl}/delivery/wallet?error=security_check_failed`);
        }

        const deliveryBoyId = params.get('merchant_param1');
        if (!deliveryBoyId) {
            console.error('Missing merchant_param1 (deliveryBoyId) in HDFC settlement return');
            return res.redirect(`${frontendUrl}/delivery/wallet?error=missing_data`);
        }

        const deliveryBoy = await Delivery.findById(deliveryBoyId);
        if (!deliveryBoy) {
            console.error('Delivery boy not found for settlement', deliveryBoyId);
            return res.redirect(`${frontendUrl}/delivery/wallet?error=delivery_boy_not_found`);
        }

        // Handle the settlement
        // 1. Decrement cash liability
        deliveryBoy.cashCollected = Math.max(0, (deliveryBoy.cashCollected || 0) - amount);
        await deliveryBoy.save();

        // 2. Log in WalletTransaction
        const { logCashSettlement } = await import('../../../services/walletManagementService');
        await logCashSettlement(
            deliveryBoyId,
            amount,
            `Settled via HDFC app payment (TrackingId: ${trackingId})`,
            trackingId!
        );

        // 3. Create CashCollection record for Admin Panel
        await CashCollection.create({
            deliveryBoy: deliveryBoyId,
            amount,
            remark: `App Payment Settlement (HDFC Tracking: ${trackingId})`,
            paymentMethod: 'HDFC',
            collectedAt: new Date(),
        });

        return res.redirect(`${frontendUrl}/delivery/wallet?payment=success&id=${settlementId}`);
    } catch (error: any) {
        console.error('Error handling HDFC settlement return:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/delivery/wallet?error=system_error`);
    }
};

/**
 * Handle HDFC settlement cancellation
 */
export const hdfcSettleCashCancel = async (_req: Request, res: Response) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // User cancelled, just redirect back
        return res.redirect(`${frontendUrl}/delivery/wallet?error=cancelled`);
    } catch (error: any) {
        console.error('Error handling HDFC settlement cancel:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/delivery/wallet?error=cancel_error`);
    }
};

