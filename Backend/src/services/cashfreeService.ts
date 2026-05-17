import axios from 'axios';
import AppSettings from '../models/AppSettings';

export const createCashfreeOrder = async (
    orderId: string,
    amount: number,
    redirectUrl: string,
    customerDetails: { customer_id: string; customer_phone: string; customer_email?: string; customer_name?: string }
) => {
    let environment = 'SANDBOX';
    try {
        const settings = await AppSettings.getSettings();
        const cashfreeConfig = settings.paymentGateways?.cashfree;

        // Prefer environment variables over DB to avoid stale admin settings.
        let appId = process.env.CASHFREE_APP_ID?.trim() || cashfreeConfig?.appId?.trim();
        let secretKey = process.env.CASHFREE_SECRET_KEY?.trim() || cashfreeConfig?.secretKey?.trim();
        let env = process.env.CASHFREE_ENVIRONMENT?.trim() || cashfreeConfig?.environment?.trim();

        // Default to SANDBOX if still not set
        environment = (env || 'SANDBOX').toUpperCase();

        // AUTO-DETECTION: If the secret key is a production key, force PRODUCTION mode
        // Cashfree production keys usually start with 'cfsk_ma_prod_'
        if (secretKey && secretKey.startsWith('cfsk_ma_prod_')) {
            environment = 'PRODUCTION';
        }

        console.log(`[Cashfree Debug] Initializing order ${orderId}`);
        console.log(`[Cashfree Debug] Environment: ${environment}`);
        console.log(`[Cashfree Debug] AppID Source: ${process.env.CASHFREE_APP_ID ? 'ENV' : 'DB'}`);
        console.log(`[Cashfree Debug] SecretKey Source: ${process.env.CASHFREE_SECRET_KEY ? 'ENV' : 'DB'}`);
        console.log(`[Cashfree Debug] AppID (masked): ${appId ? appId.substring(0, 6) + '...' + appId.substring(appId.length - 4) : 'MISSING'}`);
        console.log(`[Cashfree Debug] SecretKey (masked): ${secretKey ? secretKey.substring(0, 10) + '...' : 'MISSING'}`);
        console.log(`[Cashfree Debug] SecretKey Prefix: ${secretKey ? secretKey.substring(0, 15) : 'N/A'}`);

        if (!appId || !secretKey) {
            throw new Error('Cashfree credentials not configured (Check .env or DB settings)');
        }

        const baseUrl = environment === 'PRODUCTION' 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        console.log(`[Cashfree Debug] Base URL: ${baseUrl}`);

        // Cashfree Production STRICTLY requires HTTPS for the return URL.
        // Even for localhost, we MUST send an 'https://' prefix or the API will return 400.
        let finalRedirectUrl = redirectUrl;
        if (environment === 'PRODUCTION' && finalRedirectUrl.startsWith('http://')) {
            console.log(`[Cashfree Debug] Converting HTTP to HTTPS for production return URL`);
            finalRedirectUrl = finalRedirectUrl.replace('http://', 'https://');
        }
        
        console.log(`[Cashfree Debug] Original Return URL: ${redirectUrl}`);
        console.log(`[Cashfree Debug] Final Return URL: ${finalRedirectUrl}`);

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

        console.log(`[Cashfree Debug] Request payload:`, JSON.stringify({
            order_id: payload.order_id,
            order_amount: payload.order_amount,
            order_currency: payload.order_currency,
            customer_id: payload.customer_details.customer_id,
            return_url: payload.order_meta.return_url,
            headers_used: {
                'x-client-id': appId?.substring(0, 6) + '...',
                'x-api-version': '2023-08-01'
            }
        }, null, 2));

        const response = await axios.post(`${baseUrl}/orders`, payload, {
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

        console.log(`[Cashfree Debug] Order created successfully:`, response.data.order_id);

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
        console.error('[Cashfree Error] Full error response:', JSON.stringify(errorData, null, 2));
        console.error('[Cashfree Error] HTTP Status:', error.response?.status);
        console.error('[Cashfree Error] Environment Used:', environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX');
        
        let message = error.message;
        if (errorData) {
            message = errorData.message || message;
            console.error('[Cashfree Error] Message:', message);
            console.error('[Cashfree Error] Code:', errorData.code);
            
            // If it's a 400 error about return_url or whitelisting, give a helpful hint
            if (errorData.code === 'invalid_request' || error.response?.status === 400) {
                if (message.toLowerCase().includes('return_url')) {
                    message = "PRODUCTION Issue: Cashfree Production requires HTTPS return URL. Current URL was converted to HTTPS. If still failing, check domain is whitelisted in Production Account Settings.";
                } else if (message.toLowerCase().includes('whitelist')) {
                    message = "PRODUCTION Issue: Your domain is not whitelisted in Cashfree Production Account. Go to Dashboard > Settings > Whitelisted URLs and add your domain.";
                } else if (message.toLowerCase().includes('transaction')) {
                    message = "PRODUCTION Issue: Transactions feature not enabled in your Production account. Enable it in Cashfree Dashboard > Settings > Features > Payments.";
                } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('auth')) {
                    message = "PRODUCTION Issue: Check if App ID and Secret Key are correct for PRODUCTION environment. Test Key and Production Key are different.";
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

        let appId = process.env.CASHFREE_APP_ID?.trim() || cashfreeConfig?.appId?.trim();
        let secretKey = process.env.CASHFREE_SECRET_KEY?.trim() || cashfreeConfig?.secretKey?.trim();
        let env = process.env.CASHFREE_ENVIRONMENT?.trim() || cashfreeConfig?.environment?.trim();

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
