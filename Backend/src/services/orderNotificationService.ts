import { Server as SocketIOServer } from 'socket.io';
import Delivery from '../models/Delivery';
import Order from '../models/Order';
import Seller from '../models/Seller';
import DeliveryTracking from '../models/DeliveryTracking';
import OrderItem from '../models/OrderItem';
import mongoose from 'mongoose';
import { notifySellersOfOrderUpdate } from './sellerNotificationService';
import { sendDeliveryTaskNotification } from './notificationService';

// Track order notification state
export interface OrderNotificationState {
    orderId: string;
    orderData: any;
    notifiedDeliveryBoys: Set<string>;
    rejectedDeliveryBoys: Set<string>;
    acceptedBy: string | null;
    createdAt: Date;
}

export const notificationStates = new Map<string, OrderNotificationState>();

// Periodically clean up stale notification states (older than 1 hour)
setInterval(() => {
    const now = Date.now();
    const TTL = 60 * 60 * 1000; // 1 hour

    for (const [orderId, state] of notificationStates.entries()) {
        if (now - state.createdAt.getTime() > TTL) {
            notificationStates.delete(orderId);
            console.log(`🧹 Cleaned up stale notification state for order ${orderId}`);
        }
    }
}, 5 * 60 * 1000); // Check every 5 minutes

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find all available delivery boys (online and active)
 */
export async function findAvailableDeliveryBoys(): Promise<mongoose.Types.ObjectId[]> {
    try {
        const deliveryBoys = await Delivery.find({
            isOnline: true,
            // Relaxed check: include any online delivery boy for testing/broader reach
        }).select('_id');

        return deliveryBoys.map(db => db._id);
    } catch (error) {
        console.error('Error finding available delivery boys:', error);
        return [];
    }
}

/**
 * Find delivery boys near a specific location within a radius
 * Uses the delivery boy's location from the Delivery model (preferred)
 * or falls back to DeliveryTracking
 */
export async function findDeliveryBoysNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
): Promise<{ deliveryBoyId: mongoose.Types.ObjectId; distance: number }[]> {
    try {
        // 1. Try to find delivery boys using the new GeoJSON location field in Delivery model
        const nearbyDeliveryBoys: { deliveryBoyId: mongoose.Types.ObjectId; distance: number }[] = [];

        const deliveryBoysWithLocation = await Delivery.find({
            isOnline: true,
            status: 'Active',
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: radiusKm * 1000 // Convert km to meters
                }
            }
        }).select('_id location');

        if (deliveryBoysWithLocation.length > 0) {
            for (const db of deliveryBoysWithLocation) {
                if (db.location && db.location.coordinates) {
                    const [dbLng, dbLat] = db.location.coordinates;
                    const distance = calculateDistance(latitude, longitude, dbLat, dbLng);
                    nearbyDeliveryBoys.push({
                        deliveryBoyId: db._id as mongoose.Types.ObjectId,
                        distance
                    });
                }
            }

            return nearbyDeliveryBoys.sort((a, b) => a.distance - b.distance);
        }

        // 2. Fallback to the old method using DeliveryTracking if no delivery boys found with the new field
        // Get all active and online delivery boys
        const allDeliveryBoys = await Delivery.find({
            isOnline: true,
            status: 'Active',
        }).select('_id');

        if (allDeliveryBoys.length === 0) {
            return [];
        }

        // Get latest locations for these delivery boys from DeliveryTracking
        const deliveryBoyIds = allDeliveryBoys.map(db => db._id);

        // Get the most recent tracking record for each delivery boy
        const trackingRecords = await DeliveryTracking.aggregate([
            {
                $match: {
                    deliveryBoy: { $in: deliveryBoyIds },
                    // Check both legacy fields and new currentLocation structure
                    $or: [
                        { 'currentLocation.latitude': { $exists: true }, 'currentLocation.longitude': { $exists: true } },
                        { latitude: { $exists: true }, longitude: { $exists: true } }
                    ]
                }
            },
            {
                $sort: { 'currentLocation.timestamp': -1, updatedAt: -1 }
            },
            {
                $group: {
                    _id: '$deliveryBoy',
                    latestLocation: { $first: '$currentLocation' },
                    legacyLat: { $first: '$latitude' },
                    legacyLng: { $first: '$longitude' }
                }
            }
        ]);

        for (const record of trackingRecords) {
            const deliveryLat = record.latestLocation?.latitude || record.legacyLat;
            const deliveryLng = record.latestLocation?.longitude || record.legacyLng;

            if (deliveryLat && deliveryLng) {
                const distance = calculateDistance(latitude, longitude, deliveryLat, deliveryLng);

                if (distance <= radiusKm) {
                    nearbyDeliveryBoys.push({
                        deliveryBoyId: record._id,
                        distance,
                    });
                }
            }
        }

        // Also include delivery boys who don't have tracking data yet (they might be new)
        // but give them a default distance
        const trackedIds = new Set(trackingRecords.map(r => r._id.toString()));
        for (const db of allDeliveryBoys) {
            if (!trackedIds.has(db._id.toString())) {
                // Include untracked delivery boys with a default distance
                nearbyDeliveryBoys.push({
                    deliveryBoyId: db._id as mongoose.Types.ObjectId,
                    distance: radiusKm / 2, // Default to half the radius
                });
            }
        }

        // Sort by distance (nearest first)
        nearbyDeliveryBoys.sort((a, b) => a.distance - b.distance);

        return nearbyDeliveryBoys;
    } catch (error) {
        console.error('Error finding nearby delivery boys:', error);
        return [];
    }
}

/**
 * Find delivery boys near seller locations for an order
 * Aggregates all unique sellers from order items and finds delivery boys within their service radius
 */
export async function findDeliveryBoysNearSellerLocations(
    order: any
): Promise<mongoose.Types.ObjectId[]> {
    try {
        // Get unique seller IDs from order items
        let sellerIds: string[] = [];

        if (order.items && order.items.length > 0) {
            sellerIds = [...new Set(
                order.items
                    ?.map((item: any) => {
                        const seller = item.seller;
                        if (!seller) return null;
                        return (seller._id || seller).toString();
                    })
                    .filter((id: string | null) => id) as string[]
            )];
        }

        // --- NEW SCHEMA FALLBACK: If items array is empty, check OrderItem collection directly ---
        if (sellerIds.length === 0) {
            const items = await OrderItem.find({ order: order._id }).populate('seller');
            sellerIds = [...new Set(
                items.map((item: any) => item.seller?.toString() || (item as any).seller?._id?.toString())
                    .filter((id: any) => id) as string[]
            )];
        }

        // --- FALLBACK 2: Check sellerPickups array ---
        if (sellerIds.length === 0 && order.sellerPickups && order.sellerPickups.length > 0) {
            sellerIds = [...new Set(
                order.sellerPickups.map((p: any) => p.seller?.toString() || p.seller?._id?.toString())
                    .filter((id: any) => id) as string[]
            )];
        }

        if (sellerIds.length === 0) {
            return findAvailableDeliveryBoys();
        }

        // Get seller locations
        const sellers = await Seller.find({
            _id: { $in: sellerIds },
        }).select('latitude longitude location serviceRadiusKm storeName');

        // Find delivery boys near each seller location
        const nearbyDeliveryBoyMap = new Map<string, { distance: number }>();

        for (const seller of sellers) {
            let lat: number | null = null;
            let lng: number | null = null;

            // Prioritize GeoJSON location field and its coordinates
            if (seller.location && seller.location.coordinates && seller.location.coordinates.length === 2) {
                lng = seller.location.coordinates[0];
                lat = seller.location.coordinates[1];
            }

            // Fallback to location fields (could be in nested location or legacy top-level)
            if (lat === null || lng === null) {
                lat = (seller.location?.latitude !== undefined && seller.location?.latitude !== null)
                    ? seller.location.latitude
                    : (seller.latitude ? parseFloat(seller.latitude) : null);

                lng = (seller.location?.longitude !== undefined && seller.location?.longitude !== null)
                    ? seller.location.longitude
                    : (seller.longitude ? parseFloat(seller.longitude) : null);
            }

            if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
                console.log(`Seller ${seller.storeName} (${seller._id}) has no valid location, skipping`);
                continue;
            }

            const radius = seller.serviceRadiusKm || 10; // Default 10km
            const nearbyBoys = await findDeliveryBoysNearLocation(lat, lng, radius);

            for (const boy of nearbyBoys) {
                const boyId = boy.deliveryBoyId.toString();
                // Keep the smallest distance if same delivery boy is near multiple sellers
                if (!nearbyDeliveryBoyMap.has(boyId) || nearbyDeliveryBoyMap.get(boyId)!.distance > boy.distance) {
                    nearbyDeliveryBoyMap.set(boyId, { distance: boy.distance });
                }
            }
        }

        if (nearbyDeliveryBoyMap.size === 0) {
            return findAvailableDeliveryBoys();
        }

        // Sort by distance and return IDs
        const sortedBoys = Array.from(nearbyDeliveryBoyMap.entries())
            .sort((a, b) => a[1].distance - b[1].distance)
            .map(([id]) => new mongoose.Types.ObjectId(id));

        return sortedBoys;
    } catch (error) {
        console.error('Error finding delivery boys near seller locations:', error);
        return findAvailableDeliveryBoys();
    }
}

/**
 * Emit new order notification to delivery boys near seller locations
 * Prioritizes delivery boys within the seller's service radius
 */
export async function notifyDeliveryBoysOfNewOrder(
    io: SocketIOServer,
    order: any
): Promise<void> {
    try {
        // Find delivery boys near seller locations (within service radius)
        let nearbyDeliveryBoyIds = await findDeliveryBoysNearSellerLocations(order);

        if (nearbyDeliveryBoyIds.length === 0) {
            return;
        }

        // --- FILTER BUSY DELIVERY BOYS ---
        // Check if any of these delivery boys already have an active order
        // Active = deliveryBoyStatus is Assigned, Picked Up, or In Transit
        // Only count RECENT orders (last 24 hours) as busy to avoid blocking on stale orders
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const busyDeliveryBoys = await Order.find({
            deliveryBoy: { $in: nearbyDeliveryBoyIds },
            deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
            status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] },
            createdAt: { $gte: oneDayAgo }
        }).distinct('deliveryBoy');

        if (busyDeliveryBoys.length > 0) {
            const busyIdsSet = new Set(busyDeliveryBoys.map(id => id.toString()));
            nearbyDeliveryBoyIds = nearbyDeliveryBoyIds.filter(id => !busyIdsSet.has(id.toString()));

            if (nearbyDeliveryBoyIds.length === 0) {
                console.log('⚠️ All nearby delivery boys are currently busy with other orders.');
                return;
            }
        }
        // ---------------------------------

        // Prepare order data for notification
        const orderData = {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            deliveryAddress: order.deliveryAddress ? {
                address: order.deliveryAddress.address || 'N/A',
                city: order.deliveryAddress.city || 'N/A',
                state: order.deliveryAddress.state || '',
                pincode: order.deliveryAddress.pincode || '000000',
            } : {
                address: 'N/A',
                city: 'N/A',
                state: '',
                pincode: '000000',
            },
            total: order.total,
            subtotal: order.subtotal,
            shipping: order.shipping,
            createdAt: order.createdAt,
        };

        // Initialize notification state
        const orderId = order._id.toString();
        const notifiedIds = new Set<string>();

        // Notify all nearby delivery boys
        for (const id of nearbyDeliveryBoyIds) {
            const idString = id.toString().trim();
            notifiedIds.add(idString);

            const roomName = `delivery-${idString}`;

            // Emit socket event (if they are connected, they get it immediately)
            io.to(roomName).emit('new-order', orderData);

            // Also emit to the general delivery-notifications room so anyone listening there (debugging/admin) 
            // can see orders being broadcasted
            // io.to('delivery-notifications').emit('new-order', { ...orderData, targetedTo: idString });

            // Send push notification to delivery partner
            try {
                // We do this for all nearby boys so they get the push even if app is closed/backgrounded
                await sendDeliveryTaskNotification(idString, order.orderNumber);
            } catch (notifyError) {
                console.error(`Error sending push notification to delivery partner ${idString}:`, notifyError);
            }
        }

        if (notifiedIds.size === 0) {
            console.log('⚠️ No nearby delivery boys found to notify');
            return;
        }

        notificationStates.set(orderId, {
            orderId,
            orderData,
            notifiedDeliveryBoys: notifiedIds,
            rejectedDeliveryBoys: new Set(),
            acceptedBy: null,
            createdAt: new Date(),
        });

    } catch (error) {
        console.error('Error notifying delivery boys:', error);
    }
}

/**
 * Handle order acceptance by a delivery boy
 */
export async function handleOrderAcceptance(
    io: SocketIOServer,
    orderId: string,
    deliveryBoyId: string
): Promise<{ success: boolean; message: string }> {
    try {
        const state = notificationStates.get(orderId);
        const normalizedDeliveryBoyId = String(deliveryBoyId).trim();

        // 1. In-Memory Check (Preferred)
        if (state) {
            // Check if already accepted in memory
            if (state.acceptedBy) {
                return { success: false, message: 'Order already accepted by another delivery boy' };
            }

            // Check if this delivery boy was notified
            if (!state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId)) {
                console.warn(`⚠️ Delivery boy ${normalizedDeliveryBoyId} not in notified list for acceptance of order ${orderId}. Notified:`, Array.from(state.notifiedDeliveryBoys));
                return { success: false, message: 'You were not notified about this order' };
            }

            // Check if this delivery boy already rejected
            if (state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId)) {
                return { success: false, message: 'You have already rejected this order' };
            }

            // Mark as accepted in memory
            state.acceptedBy = normalizedDeliveryBoyId;
        } else {
            console.log(`⚠️ Notification state missing for order ${orderId}. Checking database for fallback...`);
            // 2. Database Fallback (For server restarts/stale notifications)
            // We skip "notified" and "rejected" checks because that data is lost.
            // We assume if they have the ID, they were notified effectively.
        }

        // Update order in database
        const order = await Order.findById(orderId);
        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        // Check if order already has a delivery boy assigned
        if (order.deliveryBoy) {
            return { success: false, message: 'Order already assigned to another delivery boy' };
        }

        // Assign order to delivery boy
        order.deliveryBoy = new mongoose.Types.ObjectId(normalizedDeliveryBoyId);
        order.deliveryBoyStatus = 'Assigned';
        order.assignedAt = new Date();
        order.status = 'Processed'; // Mark as processed when assigned

        await order.save();

        // Emit order-accepted event to stop notifications for all delivery boys
        io.to('delivery-notifications').emit('order-accepted', {
            orderId,
            acceptedBy: normalizedDeliveryBoyId,
        });

        // Also emit to individual rooms (notifiedId is already a string from Set)
        if (state) {
            for (const notifiedId of state.notifiedDeliveryBoys) {
                const notifiedIdString = String(notifiedId).trim();
                io.to(`delivery-${notifiedIdString}`).emit('order-accepted', {
                    orderId,
                    acceptedBy: normalizedDeliveryBoyId,
                });
            }
            // Clean up notification state
            notificationStates.delete(orderId);
        } else {
            // If no state, we can't emit to specific originally notified list,
            // but 'delivery-notifications' room covers the general case.
            // We can also try to emit to the accepting delivery boy just in case
            io.to(`delivery-${normalizedDeliveryBoyId}`).emit('order-accepted', {
                orderId,
                acceptedBy: normalizedDeliveryBoyId,
            });
        }

        // Emit delivery-boy-accepted event to customer for tracking
        io.to(`order-${orderId}`).emit('delivery-boy-accepted', {
            orderId,
            deliveryBoyId: normalizedDeliveryBoyId,
            message: 'Delivery boy accepted your order. Tracking started.',
        });

        console.log(`✅ Order ${orderId} accepted by delivery boy ${normalizedDeliveryBoyId} ${state ? '(Memory)' : '(DB Fallback)'}`);
        return { success: true, message: 'Order accepted successfully' };
    } catch (error) {
        console.error('Error handling order acceptance:', error);
        return { success: false, message: 'Error accepting order' };
    }
}

/**
 * Handle order rejection by a delivery boy
 */
export async function handleOrderRejection(
    io: SocketIOServer,
    orderId: string,
    deliveryBoyId: string
): Promise<{ success: boolean; message: string; allRejected: boolean }> {
    try {
        const state = notificationStates.get(orderId);

        if (!state) {
            return { success: false, message: 'Order notification not found', allRejected: false };
        }

        // Check if already accepted
        if (state.acceptedBy) {
            return { success: false, message: 'Order already accepted', allRejected: false };
        }

        // Check if this delivery boy was notified
        const normalizedDeliveryBoyId = String(deliveryBoyId).trim();
        if (!state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId)) {
            console.warn(`⚠️ Delivery boy ${normalizedDeliveryBoyId} not in notified list for order ${orderId}. Notified:`, Array.from(state.notifiedDeliveryBoys));
            return { success: false, message: 'You were not notified about this order', allRejected: false };
        }

        // Check if already rejected
        if (state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId)) {
            return { success: true, message: 'You have already rejected this order', allRejected: false };
        }

        // Mark as rejected
        state.rejectedDeliveryBoys.add(normalizedDeliveryBoyId);

        // Check if all delivery boys have rejected
        const allRejected = state.rejectedDeliveryBoys.size === state.notifiedDeliveryBoys.size;

        if (allRejected) {
            // Emit order-rejected-by-all event
            io.to('delivery-notifications').emit('order-rejected-by-all', {
                orderId,
            });

            try {
                // Update order in database to "Rejected"
                const order = await Order.findById(orderId);
                if (order) {
                    order.status = 'Rejected';
                    order.deliveryBoyStatus = 'Failed';
                    order.adminNotes = (order.adminNotes ? order.adminNotes + '\n' : '') +
                        `[${new Date().toISOString()}] Rejected: All notified delivery boys (${state.notifiedDeliveryBoys.size}) rejected the order.`;
                    await order.save();

                    // Notify customer via socket
                    io.to(`order-${orderId}`).emit('order-rejected', {
                        orderId,
                        message: 'Unfortunately, no delivery partner is available at the moment. Your order has been rejected.',
                    });

                    // Notify sellers/restaurants
                    notifySellersOfOrderUpdate(io, order, 'STATUS_UPDATE');

                    console.log(`✅ All delivery boys rejected order ${orderId}. Order status updated to Rejected.`);
                } else {
                    console.error(`❌ Order ${orderId} not found when trying to update rejection status`);
                }
            } catch (dbError) {
                console.error(`❌ Error updating order ${orderId} to Rejected status:`, dbError);
                // We still proceed with cleanup to avoid memory leaks/stuck state
            }

            // Clean up notification state
            notificationStates.delete(orderId);
        } else {
            // Emit rejection acknowledgment to the specific delivery boy
            io.to(`delivery-${deliveryBoyId}`).emit('order-rejection-acknowledged', {
                orderId,
            });
        }

        console.log(`🚫 Delivery boy ${deliveryBoyId} rejected order ${orderId}`);
        return { success: true, message: 'Order rejected', allRejected };
    } catch (error) {
        console.error('Error handling order rejection:', error);
        return { success: false, message: 'Error rejecting order', allRejected: false };
    }
}

/**
 * Get notification state for an order
 */
export function getNotificationState(orderId: string): OrderNotificationState | undefined {
    return notificationStates.get(orderId);
}

/**
 * Clean up notification state (for testing or manual cleanup)
 */
export function clearNotificationState(orderId: string): void {
    notificationStates.delete(orderId);
}

/**
 * Send all pending notifications to a delivery boy who just came online or reconnected
 */
export async function sendPendingNotificationsToDeliveryBoy(
    io: SocketIOServer,
    deliveryBoyId: string
): Promise<void> {
    try {
        const normalizedDeliveryBoyId = deliveryBoyId.trim();
        const roomName = `delivery-${normalizedDeliveryBoyId}`;

        // Find all active notification states where this delivery boy was notified 
        // but hasn't accepted/rejected yet
        for (const [orderId, state] of notificationStates.entries()) {
            if (
                state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId) &&
                !state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId) &&
                !state.acceptedBy
            ) {
                // Check if order is still active in DB just in case
                const order = await Order.findById(orderId).select('status deliveryBoy');
                if (order && order.status !== 'Cancelled' && order.status !== 'Rejected' && !order.deliveryBoy) {
                    io.to(roomName).emit('new-order', state.orderData);
                    console.log(`📡 Resent pending notification for order ${orderId} to reconnected delivery boy ${normalizedDeliveryBoyId}`);
                } else {
                    // Order is no longer valid for assignment, clean up state if it's old
                    if (Date.now() - state.createdAt.getTime() > 30 * 60 * 1000) { // 30 mins
                        notificationStates.delete(orderId);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error resending pending notifications to delivery boy ${deliveryBoyId}:`, error);
    }
}
