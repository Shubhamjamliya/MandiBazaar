import axios from 'axios';
import AppSettings from '../models/AppSettings';

export const createCashfreeOrder = async (
    orderId: string,
    amount: number,
    redirectUrl: string,
    customerDetails: { customer_id: string; customer_phone: string; customer_email?: string; customer_name?: string }
) => {
    try {
        const settings = await AppSettings.getSettings();
        const cashfreeConfig = settings.paymentGateways?.cashfree;
        
        // Load credentials with better prioritization
        let appId = cashfreeConfig?.appId?.trim();
        let secretKey = cashfreeConfig?.secretKey?.trim();
        let env = cashfreeConfig?.environment?.trim();

        // If credentials are not in DB, fallback to .env
        if (!appId || !secretKey) {
            appId = process.env.CASHFREE_APP_ID?.trim();
            secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
            env = env || process.env.CASHFREE_ENVIRONMENT?.trim();
        }

        // Default to SANDBOX if still not set
        let environment = (env || 'SANDBOX').toUpperCase();

        // AUTO-DETECTION: If the secret key is a production key, force PRODUCTION mode
        // Cashfree production keys usually start with 'cfsk_ma_prod_'
        if (secretKey && secretKey.startsWith('cfsk_ma_prod_')) {
            environment = 'PRODUCTION';
        }

        console.log(`Cashfree Service: Mode=${environment}, AppID=${appId ? appId.substring(0, 8) + '...' : 'MISSING'}`);

        if (!appId || !secretKey) {
            throw new Error('Cashfree credentials not configured (Check .env or DB settings)');
        }

        const baseUrl = environment === 'PRODUCTION' 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        // Cashfree Production STRICTLY requires HTTPS for the return URL.
        // Even for localhost, we MUST send an 'https://' prefix or the API will return 400.
        let finalRedirectUrl = redirectUrl;
        if (environment === 'PRODUCTION' && finalRedirectUrl.startsWith('http://')) {
            finalRedirectUrl = finalRedirectUrl.replace('http://', 'https://');
        }

        const payload = {
            order_id: orderId,
            order_amount: amount,
            order_currency: 'INR',
            customer_details: {
                customer_id: customerDetails.customer_id,
                customer_phone: customerDetails.customer_phone || '9999999999',
                customer_email: customerDetails.customer_email,
                customer_name: customerDetails.customer_name || 'Customer'
            },
            order_meta: {
                return_url: `${finalRedirectUrl}?order_id={order_id}`
            }
        };

        const response = await axios.post(`${baseUrl}/orders`, payload, {
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

        return {
            success: true,
            data: {
                payment_session_id: response.data.payment_session_id,
                order_id: response.data.order_id,
                environment: environment
            }
        };

    } catch (error: any) {
        const errorData = error.response?.data;
        console.error('Cashfree API Error Details:', JSON.stringify(errorData, null, 2));
        
        let message = error.message;
        if (errorData) {
            message = errorData.message || message;
            // If it's a 400 error about return_url or whitelisting, give a helpful hint
            if (errorData.code === 'invalid_request' || error.response?.status === 400) {
                if (message.toLowerCase().includes('return_url')) {
                    message = "Cashfree Production requires an HTTPS return URL. For localhost, please use SANDBOX mode.";
                } else if (message.toLowerCase().includes('whitelist')) {
                    message = "Domain not whitelisted in Cashfree Dashboard. Please whitelist http://localhost:5173";
                }
            }
        }
        
        return {
            success: false,
            message: message,
            details: errorData
        };
    }
};

export const verifyCashfreePayment = async (orderId: string) => {
    try {
        const settings = await AppSettings.getSettings();
        const cashfreeConfig = settings.paymentGateways?.cashfree;
        
        let appId = cashfreeConfig?.appId?.trim();
        let secretKey = cashfreeConfig?.secretKey?.trim();
        let env = cashfreeConfig?.environment?.trim();

        if (!appId || !secretKey) {
            appId = process.env.CASHFREE_APP_ID?.trim();
            secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
            env = env || process.env.CASHFREE_ENVIRONMENT?.trim();
        }

        let environment = (env || 'SANDBOX').toUpperCase();
        if (secretKey && secretKey.startsWith('cfsk_ma_prod_')) {
            environment = 'PRODUCTION';
        }

        if (!appId || !secretKey) {
            throw new Error('Cashfree credentials not configured');
        }

        const baseUrl = environment === 'PRODUCTION' 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        // Fetch order details from Cashfree
        const response = await axios.get(`${baseUrl}/orders/${orderId}`, {
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': '2023-08-01'
            }
        });
        
        // Fetch payments for the order to get the actual payment status
        const paymentsResponse = await axios.get(`${baseUrl}/orders/${orderId}/payments`, {
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': '2023-08-01'
            }
        });

        const payments = paymentsResponse.data;
        const successfulPayment = Array.isArray(payments) ? payments.find((p: any) => p.payment_status === 'SUCCESS') : null;

        const orderInfo = response.data;
        
        return {
            success: true,
            data: {
                order_status: orderInfo.order_status,
                order_amount: orderInfo.order_amount,
                payment: successfulPayment || (Array.isArray(payments) ? payments[0] : null), 
            }
        };

    } catch (error: any) {
        console.error('Error verifying Cashfree payment:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to verify Cashfree payment'
        };
    }
};
