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

/**
 * Razorpay Order Creation (Legacy/Placeholder for build)
 */
export const createRazorpayOrder = async (_orderId: string) => {
    return {
        success: false,
        message: "Razorpay is disabled.",
        data: { razorpayOrderId: '', razorpayKey: '' }
    };
};

/**
 * Razorpay Verification (Legacy/Placeholder for build)
 */
export const verifyPayment = async (_data: any) => {
    return {
        success: false,
        message: "Razorpay is disabled."
    };
};
