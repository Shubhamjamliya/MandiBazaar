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
import { createRazorpayOrder, verifyPaymentSignature } from '../../../services/paymentService';

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
 * Create a Razorpay order for cash settlement
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

        const result = await createRazorpayOrder(settlementId, amount);

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
 * Verify Razorpay settlement payment
 */
export const verifySettleCash = async (req: Request, res: Response) => {
    try {
        const deliveryBoyId = req.user!.userId;
        const {
            amount,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        } = req.body;

        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

        if (!isValid) {
            return res.status(400).json({ success: false, message: "Invalid payment signature." });
        }

        const deliveryBoy = await Delivery.findById(deliveryBoyId);
        if (!deliveryBoy) {
            return res.status(404).json({ success: false, message: "Delivery boy not found." });
        }

        // 1. Decrement cash liability
        deliveryBoy.cashCollected = Math.max(0, (deliveryBoy.cashCollected || 0) - amount);
        await deliveryBoy.save();

        // 2. Log in WalletTransaction
        const { logCashSettlement } = await import('../../../services/walletManagementService');
        await logCashSettlement(
            deliveryBoyId,
            amount,
            `Settled via app payment (Razorpay: ${razorpayPaymentId})`,
            razorpayPaymentId
        );

        // 3. Create CashCollection record for Admin Panel
        await CashCollection.create({
            deliveryBoy: deliveryBoyId,
            amount,
            remark: `App Payment Settlement (Razorpay: ${razorpayPaymentId})`,
            paymentMethod: 'razorpay',
            collectedAt: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: "Cash settled and logged successfully."
        });
    } catch (error: any) {
        console.error('Error verifying settlement:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify settlement',
        });
    }
};
