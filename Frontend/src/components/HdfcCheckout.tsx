import React, { useEffect, useRef, useState } from 'react';
import { createHdfcOrder } from '../services/api/paymentService'; // rename not strictly necessary
import CashfreeCheckout from './CashfreeCheckout';

interface HdfcCheckoutProps {
    orderId: string;
    gateway?: string;
    onFailure: (error: string) => void;
}

const HdfcCheckout: React.FC<HdfcCheckoutProps> = ({
    orderId,
    gateway,
    onFailure,
}) => {
    const formRef = useRef<HTMLFormElement>(null);
    const [provider, setProvider] = useState<'HDFC' | 'CASHFREE' | null>(null);
    const [cashfreeData, setCashfreeData] = useState<any>(null);
    const [hdfcData, setHdfcData] = useState<{
        encRequest: string;
        accessCode: string;
        gatewayUrl: string;
    } | null>(null);

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        
        const fetchPaymentDetails = async () => {
            try {
                hasFetched.current = true;
                // Call backend to create payment payload
                const orderResponse = await createHdfcOrder(orderId, gateway);

                if (!orderResponse.success) {
                    onFailure(orderResponse.message || 'Failed to initialize payment');
                    return;
                }

                if (orderResponse.provider === 'CASHFREE') {
                    setProvider('CASHFREE');
                    setCashfreeData(orderResponse.data);
                } else {
                    setProvider('HDFC');
                    const { encRequest, accessCode, gatewayUrl } = orderResponse.data || orderResponse;
                    if (encRequest && accessCode && gatewayUrl) {
                        setHdfcData({ encRequest, accessCode, gatewayUrl });
                    }
                }
            } catch (error: any) {
                console.error('Payment initiation error:', error);
                const message = error.response?.data?.message || error.message || 'Failed to initiate payment';
                onFailure(message);
            }
        };

        fetchPaymentDetails();
    }, [orderId, gateway, onFailure]);

    useEffect(() => {
        if (provider === 'HDFC' && hdfcData && formRef.current) {
            // Auto submit the form once data is loaded
            formRef.current.submit();
        }
    }, [provider, hdfcData]);

    if (provider === 'CASHFREE' && cashfreeData) {
        return (
            <CashfreeCheckout 
                paymentSessionId={cashfreeData.payment_session_id} 
                environment={cashfreeData.environment} 
                onFailure={onFailure} 
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">
                        {hdfcData ? 'Redirecting to Payment Gateway...' : 'Initializing Payment...'}
                    </h3>
                    <p className="text-gray-600">Please do not refresh the page or press back.</p>
                </div>
            </div>

            {provider === 'HDFC' && hdfcData && (
                <form 
                    ref={formRef} 
                    method="POST" 
                    action={hdfcData.gatewayUrl}
                    className="hidden"
                >
                    <input type="hidden" name="encRequest" id="encRequest" value={hdfcData.encRequest} />
                    <input type="hidden" name="access_code" id="access_code" value={hdfcData.accessCode} />
                </form>
            )}
        </div>
    );
};

export default HdfcCheckout;
