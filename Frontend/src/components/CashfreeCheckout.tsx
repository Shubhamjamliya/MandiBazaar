import React, { useEffect, useState } from 'react';

declare global {
    interface Window {
        Cashfree: any;
    }
}

interface CashfreeCheckoutProps {
    paymentSessionId: string;
    environment: 'SANDBOX' | 'PRODUCTION';
    onFailure: (error: string) => void;
}

const CashfreeCheckout: React.FC<CashfreeCheckoutProps> = ({
    paymentSessionId,
    environment,
    onFailure,
}) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initCashfree = async () => {
            try {
                // Dynamically load Cashfree script if not already loaded
                if (!window.Cashfree) {
                    const script = document.createElement('script');
                    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
                    script.async = true;
                    document.body.appendChild(script);

                    await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
                    });
                }

                if (!window.Cashfree) {
                    throw new Error('Cashfree SDK failed to initialize');
                }

                const cashfree = window.Cashfree({
                    mode: environment === 'SANDBOX' ? 'sandbox' : 'production'
                });

                cashfree.checkout({
                    paymentSessionId: paymentSessionId,
                    redirectTarget: '_self'
                }).then((result: any) => {
                    if (result.error) {
                        onFailure(result.error.message || 'Payment failed');
                    }
                });

            } catch (error: any) {
                console.error('Cashfree init error:', error);
                onFailure(error.message || 'Failed to initialize payment');
            } finally {
                setLoading(false);
            }
        };

        if (paymentSessionId) {
            initCashfree();
        }
    }, [paymentSessionId, environment, onFailure]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">
                        {loading ? 'Initializing Cashfree...' : 'Redirecting to Payment Gateway...'}
                    </h3>
                    <p className="text-gray-600">Please do not refresh the page or press back.</p>
                </div>
            </div>
        </div>
    );
};

export default CashfreeCheckout;
