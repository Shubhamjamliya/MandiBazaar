import mongoose from 'mongoose';
import Order from '../models/Order';
import Commission from '../models/Commission';
import Seller from '../models/Seller';
import Delivery from '../models/Delivery';
import WalletTransaction from '../models/WalletTransaction';
import CashCollection from '../models/CashCollection';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export class SettlementError extends Error {}

export const runInTransaction = async <T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> => {
    const session = await mongoose.startSession();
    try {
        let result: T;
        await session.withTransaction(async () => {
            result = await fn(session);
        });
        return result!;
    } finally {
        await session.endSession();
    }
};

/**
 * True when a COD order's cash was collected by a delivery boy and has not yet reached the platform.
 */
export const isCodCashWithDeliveryBoy = (order: any): boolean =>
    order.paymentMethod === 'COD' &&
    !!order.collectedBy &&
    order.collectionMethod !== 'online_scanner' &&
    !order.codSettled;

/**
 * Credit a seller's earning into hold (not withdrawable) until the COD cash is settled.
 */
export const holdSellerEarning = async (
    sellerId: string,
    amount: number,
    description: string,
    orderId: string,
    commissionId: string,
    session?: mongoose.ClientSession
) => {
    await WalletTransaction.create(
        [
            {
                userId: sellerId,
                userType: 'SELLER',
                amount,
                type: 'Credit',
                description,
                status: 'Pending',
                reference: `HOLD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                relatedOrder: orderId,
                relatedCommission: commissionId,
            },
        ],
        { session }
    );
    await Seller.updateOne({ _id: sellerId }, { $inc: { holdBalance: amount } }, { session });
};

/**
 * Move a fully settled COD order's seller earnings from hold to withdrawable balance.
 */
export const releaseSellerHoldForOrder = async (order: any, session?: mongoose.ClientSession) => {
    const commissions = await Commission.find({
        order: order._id,
        type: 'SELLER',
        status: 'Pending',
    }).session(session || null);

    for (const commission of commissions) {
        const updated = await Commission.findOneAndUpdate(
            { _id: commission._id, status: 'Pending' },
            { $set: { status: 'Paid', paidAt: new Date() } },
            { new: true, session }
        );
        if (!updated) continue;

        const net = round2(commission.orderAmount - commission.commissionAmount);
        await Seller.updateOne(
            { _id: commission.seller },
            { $inc: { holdBalance: -net, balance: net } },
            { session }
        );
        await WalletTransaction.updateOne(
            { relatedCommission: commission._id, status: 'Pending' },
            {
                $set: {
                    status: 'Completed',
                    description: `COD sale proceeds for Order #${order.orderNumber} (cash received by platform)`,
                },
            },
            { session }
        );
    }
};

/**
 * Allocate settled cash to the delivery boy's collected COD orders, oldest first.
 * Orders that become fully settled release their sellers' held earnings.
 */
export const applyCashSettlementToOrders = async (
    deliveryBoyId: string,
    amount: number,
    session?: mongoose.ClientSession
) => {
    let remaining = round2(amount);
    const settledOrders: { order: mongoose.Types.ObjectId; amount: number }[] = [];

    const orders = await Order.find({
        collectedBy: deliveryBoyId,
        paymentMethod: 'COD',
        collectedAt: { $exists: true },
        collectionMethod: { $ne: 'online_scanner' },
        codSettled: { $ne: true },
    })
        .sort({ collectedAt: 1 })
        .session(session || null);

    for (const order of orders) {
        if (remaining <= 0) break;

        const alreadySettled = order.codSettledAmount || 0;
        const due = round2(order.total - alreadySettled);
        const applied = round2(Math.min(Math.max(due, 0), remaining));
        const newSettled = round2(alreadySettled + applied);
        const fullySettled = newSettled >= round2(order.total);

        await Order.updateOne(
            { _id: order._id },
            {
                $set: {
                    codSettledAmount: newSettled,
                    codSettled: fullySettled,
                    ...(fullySettled ? { codSettledAt: new Date() } : {}),
                },
            },
            { session }
        );

        remaining = round2(remaining - applied);
        if (applied > 0) settledOrders.push({ order: order._id, amount: applied });

        if (fullySettled) {
            await releaseSellerHoldForOrder(order, session);
        }
    }

    return settledOrders;
};

/**
 * Reduce the delivery boy's cash in hand and settle the matching COD orders.
 */
export const settleDeliveryBoyCash = async (
    deliveryBoyId: string,
    amount: number,
    session?: mongoose.ClientSession
) => {
    const settlementAmount = round2(amount);
    const deliveryBoy = await Delivery.findOneAndUpdate(
        { _id: deliveryBoyId, cashCollected: { $gte: settlementAmount - 0.001 } },
        { $inc: { cashCollected: -settlementAmount } },
        { new: true, session }
    );

    if (!deliveryBoy) {
        throw new SettlementError('Amount exceeds the delivery boy\'s current cash in hand.');
    }

    if (deliveryBoy.cashCollected < 0.005) {
        deliveryBoy.cashCollected = 0;
        await Delivery.updateOne({ _id: deliveryBoyId }, { $set: { cashCollected: 0 } }, { session });
    }

    const settledOrders = await applyCashSettlementToOrders(deliveryBoyId, settlementAmount, session);
    return { deliveryBoy, settledOrders };
};

/**
 * Sum of handover requests still waiting for admin approval.
 */
export const getPendingHandoverAmount = async (deliveryBoyId: string) => {
    const result = await CashCollection.aggregate([
        { $match: { deliveryBoy: new mongoose.Types.ObjectId(deliveryBoyId), status: 'Pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return round2(result[0]?.total || 0);
};
