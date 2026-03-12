import api from './config';

/**
 * Create HDFC order for payment.
 * Gets the encrypted request payload from backend.
 */
export const createHdfcOrder = async (orderId: string) => {
    try {
        const response = await api.post('/payment/create-order', { orderId });
        return response.data;
    } catch (error: any) {
        console.error('Error creating HDFC order:', error);
        throw error;
    }
};

/**
 * Get payment history (if needed)
 */
export const getPaymentHistory = async () => {
    try {
        const response = await api.get('/customer/payments');
        return response.data;
    } catch (error: any) {
        console.error('Error getting payment history:', error);
        throw error;
    }
};
