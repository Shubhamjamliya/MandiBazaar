import api from './config';

/**
 * Get wallet balance (for delivery boys)
 */
export const getDeliveryWalletBalance = async () => {
    try {
        const response = await api.get('/delivery/wallet/balance');
        return response.data;
    } catch (error: any) {
        console.error('Error getting wallet balance:', error);
        throw error;
    }
};

/**
 * Get wallet transactions (for delivery boys)
 */
export const getDeliveryWalletTransactions = async (page: number = 1, limit: number = 20) => {
    try {
        const response = await api.get('/delivery/wallet/transactions', {
            params: { page, limit },
        });
        return response.data;
    } catch (error: any) {
        console.error('Error getting wallet transactions:', error);
        throw error;
    }
};

/**
 * Request withdrawal (for delivery boys)
 */
export const requestDeliveryWithdrawal = async (amount: number, paymentMethod: 'Bank Transfer' | 'UPI') => {
    try {
        const response = await api.post('/delivery/wallet/withdraw', {
            amount,
            paymentMethod,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error requesting withdrawal:', error);
        throw error;
    }
};

/**
 * Get withdrawal requests (for delivery boys)
 */
export const getDeliveryWithdrawals = async (status?: string) => {
    try {
        const response = await api.get('/delivery/wallet/withdrawals', {
            params: status ? { status } : {},
        });
        return response.data;
    } catch (error: any) {
        console.error('Error getting withdrawals:', error);
        throw error;
    }
};

/**
 * Get commission earnings (for delivery boys)
 */
export const getDeliveryCommissions = async () => {
    try {
        const response = await api.get('/delivery/wallet/commissions');
        return response.data;
    } catch (error: any) {
        console.error('Error getting commissions:', error);
        throw error;
    }
};

/**
 * Create Settle Cash Order (Razorpay)
 */
export const createSettleCashOrder = async (amount: number) => {
    try {
        const response = await api.post('/delivery/wallet/settle-cash/create', { amount });
        return response.data;
    } catch (error: any) {
        console.error('Error creating settlement order:', error);
        throw error;
    }
};

/**
 * Verify Settle Cash Payment
 */
export const verifySettleCash = async (data: {
    amount: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}) => {
    try {
        const response = await api.post('/delivery/wallet/settle-cash/verify', data);
        return response.data;
    } catch (error: any) {
        console.error('Error verifying settlement:', error);
        throw error;
    }
};
