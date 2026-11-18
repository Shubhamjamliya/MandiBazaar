import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import {
    OrderNotificationData,
    getOrderNotificationById,
    acceptOrderRest,
    rejectOrderRest,
} from '../../../services/api/delivery/deliveryOrderNotificationService';

/**
 * Accept/decline screen for a pending order notification, reached by tapping
 * an OS push notification. Unlike the live socket popup (OrderNotificationCard),
 * this fetches the notification over REST so it works even when the app was
 * backgrounded or closed when the order came in.
 */
export default function DeliveryOrderNotificationDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [notification, setNotification] = useState<OrderNotificationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!id) return;

        let isMounted = true;
        (async () => {
            try {
                const data = await getOrderNotificationById(id);
                if (isMounted) setNotification(data);
            } catch (err: any) {
                if (isMounted) {
                    setError(err.response?.data?.message || err.message || 'This order is no longer available.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [id]);

    const handleAccept = async () => {
        if (!id || isProcessing) return;
        setIsProcessing(true);
        try {
            const result = await acceptOrderRest(id);
            if (result.success) {
                navigate(`/delivery/orders/${id}`, { replace: true });
            } else {
                setError(result.message || 'Failed to accept order');
                setIsProcessing(false);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to accept order');
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!id || isProcessing) return;
        setIsProcessing(true);
        try {
            const result = await rejectOrderRest(id);
            if (result.success) {
                navigate('/delivery', { replace: true });
            } else {
                setError(result.message || 'Failed to reject order');
                setIsProcessing(false);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to reject order');
            setIsProcessing(false);
        }
    };

    const formatAddress = (notif: OrderNotificationData) => {
        const { address, city, state, pincode, landmark } = notif.deliveryAddress;
        return `${address ? `${address}, ` : ''}${landmark ? `Near ${landmark}, ` : ''}${city}${state ? `, ${state}` : ''} - ${pincode}`;
    };

    return (
        <div className="min-h-screen bg-neutral-100 pb-20">
            <DeliveryHeader />
            <div className="px-4 py-4">
                {loading ? (
                    <div className="bg-white rounded-xl p-8 min-h-[300px] flex items-center justify-center shadow-sm border border-neutral-200">
                        <p className="text-neutral-500 text-sm">Loading order…</p>
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-xl p-8 min-h-[300px] flex flex-col items-center justify-center gap-4 shadow-sm border border-neutral-200">
                        <p className="text-neutral-700 text-sm text-center">{error}</p>
                        <button
                            onClick={() => navigate('/delivery', { replace: true })}
                            className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                ) : notification ? (
                    <div className="bg-white rounded-xl shadow-sm border-2 border-teal-500 p-4 sm:p-6">
                        <h3 className="text-base sm:text-lg font-bold text-neutral-900 mb-4">New Order!</h3>

                        <div className="space-y-3 mb-4">
                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Order Number</p>
                                <p className="text-base sm:text-lg font-semibold text-neutral-900 break-all">{notification.orderNumber}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Customer</p>
                                <p className="text-sm sm:text-base font-medium text-neutral-900 break-words">{notification.customerName}</p>
                                {notification.customerPhone && (
                                    <p className="text-xs sm:text-sm text-neutral-500 break-all">{notification.customerPhone}</p>
                                )}
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Delivery Area</p>
                                <p className="text-xs sm:text-sm text-neutral-900 break-words leading-relaxed">{formatAddress(notification)}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Order Amount</p>
                                <p className="text-lg sm:text-xl font-bold text-teal-600">₹{notification.total.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleReject}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-3 bg-neutral-100 active:bg-neutral-200 text-neutral-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing…' : 'Reject'}
                            </button>
                            <button
                                onClick={handleAccept}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-3 bg-teal-600 active:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing…' : 'Accept'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
