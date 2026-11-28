import { Socket } from 'socket.io-client';
import api from '../config';

export interface OrderNotificationData {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerPhone?: string; // only revealed after acceptance
    deliveryAddress: {
        address?: string; // only revealed after acceptance
        city: string;
        state?: string;
        pincode: string;
        landmark?: string;
    };
    total: number;
    subtotal: number;
    shipping: number;
    paymentMethod?: string;
    paymentStatus?: string;
    createdAt: string;
}

export interface AcceptOrderResponse {
    success: boolean;
    message: string;
}

export interface RejectOrderResponse {
    success: boolean;
    message: string;
    allRejected: boolean;
}

/**
 * Accept an order via WebSocket
 */
export const acceptOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<AcceptOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
            });
        }, 10000); // 10 second timeout

        socket.emit('accept-order', { orderId, deliveryBoyId });

        socket.once('accept-order-response', (response: AcceptOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Reject an order via WebSocket
 */
export const rejectOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<RejectOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
                allRejected: false,
            });
        }, 10000); // 10 second timeout

        socket.emit('reject-order', { orderId, deliveryBoyId });

        socket.once('reject-order-response', (response: RejectOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Fetch a pending (not-yet-assigned) order notification over REST.
 * Used when the accept/decline screen is opened from a push notification tap
 * (app was backgrounded/closed, so the live socket alert never fired).
 */
export const getOrderNotificationById = async (orderId: string): Promise<OrderNotificationData> => {
    const response = await api.get(`/delivery/orders/notification/${orderId}`);
    return response.data.data;
};

/**
 * Accept an order via REST (fallback when no live socket connection is available).
 */
export const acceptOrderRest = async (orderId: string): Promise<AcceptOrderResponse> => {
    try {
        const response = await api.post(`/delivery/orders/notification/${orderId}/accept`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to accept order',
        };
    }
};

/**
 * Reject an order via REST (fallback when no live socket connection is available).
 */
export const rejectOrderRest = async (orderId: string): Promise<RejectOrderResponse> => {
    try {
        const response = await api.post(`/delivery/orders/notification/${orderId}/reject`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to reject order',
            allRejected: false,
        };
    }
};

import { Socket } from 'socket.io-client';

export interface OrderNotificationData {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerPhone?: string; // only revealed after acceptance
    deliveryAddress: {
        address?: string; // only revealed after acceptance
        city: string;
        state?: string;
        pincode: string;
        landmark?: string;
    };
    total: number;
    subtotal: number;
    shipping: number;
    paymentMethod?: string;
    paymentStatus?: string;
    createdAt: string;
}

export interface AcceptOrderResponse {
    success: boolean;
    message: string;
}

export interface RejectOrderResponse {
    success: boolean;
    message: string;
    allRejected: boolean;
}

/**
 * Accept an order via WebSocket
 */
export const acceptOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<AcceptOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
            });
        }, 10000); // 10 second timeout

        socket.emit('accept-order', { orderId, deliveryBoyId });

        socket.once('accept-order-response', (response: AcceptOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Reject an order via WebSocket
 */
export const rejectOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<RejectOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
                allRejected: false,
            });
        }, 10000); // 10 second timeout

        socket.emit('reject-order', { orderId, deliveryBoyId });

        socket.once('reject-order-response', (response: RejectOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

