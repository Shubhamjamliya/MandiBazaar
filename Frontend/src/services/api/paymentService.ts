import api from './config';

/**
 * Create HDFC order for payment.
 * Gets the encrypted request payload from backend.
 */
export const createHdfcOrder = async (orderId: string, gateway?: string) => {
    try {
        const response = await api.post('/payment/create-order', { orderId, gateway });
        return response.data;
    } catch (error: any) {
        console.error('Error creating payment order:', error);
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

/**
 * Create Razorpay Order
 */
export const createRazorpayOrder = async (orderId: string) => {
    return createHdfcOrder(orderId, 'RAZORPAY');
};

/**
 * Razorpay Verification
 */
export const verifyPayment = async (data: any) => {
    try {
        const response = await api.post('/payment/razorpay-verify', data);
        return response.data;
    } catch (error: any) {
        console.error('Error verifying razorpay payment:', error);
        throw error;
    }
};
