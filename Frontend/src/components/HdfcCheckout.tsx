import React, { useEffect, useRef, useState } from 'react';
import { createHdfcOrder } from '../services/api/paymentService';

interface HdfcCheckoutProps {
    orderId: string;
    onFailure: (error: string) => void;
}

const HdfcCheckout: React.FC<HdfcCheckoutProps> = ({
    orderId,
    onFailure,
}) => {
    const formRef = useRef<HTMLFormElement>(null);
    const [paymentData, setPaymentData] = useState<{
        encRequest: string;
        accessCode: string;
        gatewayUrl: string;
    } | null>(null);

    useEffect(() => {
        const fetchPaymentDetails = async () => {
            try {
                // Call backend to create HDFC payload
                const orderResponse = await createHdfcOrder(orderId);

                if (!orderResponse.success) {
                    onFailure(orderResponse.message || 'Failed to initialize payment');
                    return;
                }

                const { encRequest, accessCode, gatewayUrl } = orderResponse.data;
                
                setPaymentData({ encRequest, accessCode, gatewayUrl });
            } catch (error: any) {
                console.error('Payment initiation error:', error);
                onFailure(error.message || 'Failed to initiate payment');
            }
        };

        fetchPaymentDetails();
    }, [orderId, onFailure]);

    useEffect(() => {
        if (paymentData && formRef.current) {
            // Auto submit the form once data is loaded
            formRef.current.submit();
        }
    }, [paymentData]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">
                        {paymentData ? 'Redirecting to HDFC Payment Gateway...' : 'Initializing Payment...'}
                    </h3>
                    <p className="text-gray-600">Please do not refresh the page or press back.</p>
                </div>
            </div>

            {paymentData && (
                <form 
                    ref={formRef} 
                    method="POST" 
                    action={paymentData.gatewayUrl}
                    className="hidden"
                >
                    <input type="hidden" name="encRequest" id="encRequest" value={paymentData.encRequest} />
                    <input type="hidden" name="access_code" id="access_code" value={paymentData.accessCode} />
                </form>
            )}
        </div>
    );
};

export default HdfcCheckout;
