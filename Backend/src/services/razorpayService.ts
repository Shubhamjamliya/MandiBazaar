import Razorpay from 'razorpay';
import crypto from 'crypto';
import AppSettings from '../models/AppSettings';

export const getRazorpayInstance = async () => {
    const settings = await AppSettings.getSettings();
    
    // First try DB credentials, if not present fallback to env
    const key_id = settings.paymentGateways?.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
    const key_secret = settings.paymentGateways?.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        throw new Error('Razorpay credentials are not configured.');
    }

    return new Razorpay({
        key_id,
        key_secret,
    });
};

export const createRazorpayOrder = async (orderId: string, amount: number, receipt: string) => {
    try {
        const instance = await getRazorpayInstance();

        const settings = await AppSettings.getSettings();
        const key_id = settings.paymentGateways?.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;

        // amount is in INR, razorpay expects amount in paise (1 INR = 100 paise)
        const options = {
            amount: Math.round(amount * 100), 
            currency: 'INR',
            receipt: receipt,
            notes: {
                orderId: orderId
            }
        };

        const order = await instance.orders.create(options);
        return {
            success: true,
            data: order,
            key: key_id
        };
    } catch (error: any) {
        console.error('Error creating Razorpay Order:', error);
        
        let errorMessage = 'Failed to create Razorpay Order';
        if (error.error && error.error.description) {
            errorMessage = error.error.description;
        } else if (error.description) {
            errorMessage = error.description;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            message: errorMessage
        };
    }
};

export const verifyRazorpaySignature = async (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) => {
    try {
        const settings = await AppSettings.getSettings();
        const key_secret = settings.paymentGateways?.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;

        if (!key_secret) {
            throw new Error('Razorpay key secret not found');
        }

        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            return {
                success: true,
                message: 'Payment verified successfully'
            };
        } else {
            return {
                success: false,
                message: 'Invalid signature'
            };
        }
    } catch (error: any) {
        console.error('Error verifying Razorpay signature:', error);
        return {
            success: false,
            message: error.message || 'Verification failed'
        };
    }
};
