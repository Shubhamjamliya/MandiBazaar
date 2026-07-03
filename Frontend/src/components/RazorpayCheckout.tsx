import React, { useEffect } from 'react';
import { createRazorpayOrder, verifyPayment } from '../services/api/paymentService';

interface RazorpayCheckoutProps {
    orderId: string;
    amount: number;
    razorpayOrderId: string;
    razorpayKey: string;
    onSuccess: (paymentId: string) => void;
    onFailure: (error: string) => void;
    customerDetails: {
        name: string;
        email: string;
        phone: string;
    };
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
    orderId,
    amount,
    razorpayOrderId,
    razorpayKey,
    onSuccess,
    onFailure,
    customerDetails,
}) => {
    const [isRazorpayOpen, setIsRazorpayOpen] = React.useState(false);

    useEffect(() => {
        // Load Razorpay script if not already loaded
        const loadRazorpayScript = () => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });
        };

        const initiatePayment = async () => {
            try {
                // Load Razorpay script
                const scriptLoaded = await loadRazorpayScript();
                if (!scriptLoaded) {
                    onFailure('Failed to load Razorpay SDK');
                    return;
                }

                // Removed secondary API call to preserve user gesture timing for mobile intents
                if (!razorpayOrderId || !razorpayKey) {
                    onFailure('Missing Razorpay credentials from server');
                    return;
                }

                // Format phone number to avoid fake numbers hiding UPI option
                let formattedPhone = customerDetails.phone ? String(customerDetails.phone).replace(/\D/g, '').slice(-10) : '';
                if (!formattedPhone || formattedPhone === '9999999999' || formattedPhone === '0000000000') {
                    // Pass a valid-looking dummy number so Razorpay shows the UPI icon immediately
                    // instead of waiting for the user to enter it.
                    formattedPhone = '9876543210'; 
                }

                // Razorpay options
                const options = {
                    key: razorpayKey, // Get key from backend response
                    amount: Math.round(amount * 100), // Amount in paise, rounded to avoid float issues
                    currency: 'INR',
                    name: 'Mandi Bazaar',
                    description: `Order #${orderId}`,
                    order_id: razorpayOrderId,
                    prefill: {
                        name: customerDetails.name,
                        email: customerDetails.email,
                        contact: formattedPhone,
                    },
                    theme: {
                        color: '#3B82F6',
                    },
                    handler: async function (response: any) {
                        try {
                            // Verify payment with backend
                            const verificationResponse = await verifyPayment({
                                orderId,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            });

                            if (verificationResponse.success) {
                                onSuccess(response.razorpay_payment_id);
                            } else {
                                onFailure(verificationResponse.message || 'Payment verification failed');
                            }
                        } catch (error: any) {
                            console.error('Payment verification error:', error);
                            onFailure(error.response?.data?.message || 'Payment verification failed');
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            onFailure('Payment cancelled by user');
                        },
                    },
                };

                const razorpay = new window.Razorpay(options);
                setIsRazorpayOpen(true);
                razorpay.open();
            } catch (error: any) {
                console.error('Payment initiation error:', error);
                onFailure(error.response?.data?.message || 'Failed to initiate payment');
            }
        };

        initiatePayment();
    }, [orderId, amount, customerDetails, onSuccess, onFailure]);

    if (isRazorpayOpen) {
        return null; // Remove loading overlay to ensure it doesn't block mobile UI interactions
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Initiating Payment...</h3>
                    <p className="text-gray-600">Please wait while we redirect you to the payment gateway</p>
                </div>
            </div>
        </div>
    );
};

// Export utility function to trigger Razorpay immediately without React lifecycle delays
// This preserves the User Gesture context which is REQUIRED for Android UPI Intents (GPay, PhonePe icons)
export const openRazorpay = async ({
    orderId,
    amount,
    razorpayOrderId,
    razorpayKey,
    customerDetails,
    onSuccess,
    onFailure,
}: RazorpayCheckoutProps) => {
    try {
        const loadRazorpayScript = () => {
            return new Promise((resolve) => {
                if (window.Razorpay) return resolve(true);
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });
        };

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            onFailure('Failed to load Razorpay SDK');
            return;
        }

        if (!razorpayOrderId || !razorpayKey) {
            onFailure('Missing Razorpay credentials from server');
            return;
        }

        let formattedPhone = customerDetails.phone ? String(customerDetails.phone).replace(/\D/g, '').slice(-10) : '';
        if (!formattedPhone || formattedPhone === '9999999999' || formattedPhone === '0000000000') {
            formattedPhone = '9876543210'; 
        }

        const options = {
            key: razorpayKey,
            amount: Math.round(amount * 100),
            currency: 'INR',
            name: 'Mandi Bazaar',
            description: `Order #${orderId}`,
            order_id: razorpayOrderId,
            prefill: {
                name: customerDetails.name,
                email: customerDetails.email,
                contact: formattedPhone,
            },
            theme: { color: '#3B82F6' },
            handler: async function (response: any) {
                try {
                    const verificationResponse = await verifyPayment({
                        orderId,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    });

                    if (verificationResponse.success) {
                        onSuccess(response.razorpay_payment_id);
                    } else {
                        onFailure(verificationResponse.message || 'Payment verification failed');
                    }
                } catch (error: any) {
                    onFailure(error.response?.data?.message || 'Payment verification failed');
                }
            },
            modal: {
                ondismiss: function () {
                    onFailure('Payment cancelled by user');
                },
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    } catch (error: any) {
        onFailure(error.response?.data?.message || 'Failed to initiate payment');
    }
};

export default RazorpayCheckout;
