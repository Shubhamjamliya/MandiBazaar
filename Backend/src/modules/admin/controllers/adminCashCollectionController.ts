import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../../../utils/asyncHandler";
import CashCollection from "../../../models/CashCollection";
import Delivery from "../../../models/Delivery";
import Order from "../../../models/Order";
import { logCashSettlement } from "../../../services/walletManagementService";
import {
    round2,
    runInTransaction,
    settleDeliveryBoyCash,
    getPendingHandoverAmount,
    SettlementError,
} from "../../../services/codSettlementService";

const effectiveStatus = (collection: any) => collection.status || "Approved";

/**
 * Get all cash collections
 */
export const getCashCollections = asyncHandler(
    async (req: Request, res: Response) => {
        const {
            page = 1,
            limit = 10,
            deliveryBoyId,
            fromDate,
            toDate,
            paymentMethod,
            status,
            sortBy = "collectedAt",
            sortOrder = "desc",
        } = req.query;

        const query: any = {};
        const trimmedSearch = typeof req.query.search === "string" ? req.query.search.trim() : "";

        // Filter by delivery boy
        if (deliveryBoyId) {
            query.deliveryBoy = deliveryBoyId;
        }

        // Date range filter
        if (fromDate || toDate) {
            query.collectedAt = {};
            if (fromDate) {
                query.collectedAt.$gte = new Date(fromDate as string);
            }
            if (toDate) {
                query.collectedAt.$lte = new Date(toDate as string);
            }
        }

        // Filter by payment method
        if (paymentMethod && paymentMethod !== 'all') {
            if (paymentMethod === 'online' || paymentMethod === 'Online') {
                query.paymentMethod = { $in: ['razorpay', 'HDFC'] };
            } else {
                query.paymentMethod = (paymentMethod as string).toLowerCase();
            }
        }

        if (status && status !== "all") {
            query.status = status === "Approved" ? { $in: ["Approved", null] } : status;
        }

        if (trimmedSearch) {
            const matchingDeliveryBoys = await Delivery.find({
                $or: [
                    { name: { $regex: trimmedSearch, $options: "i" } },
                    { mobile: { $regex: trimmedSearch, $options: "i" } },
                ],
            }).select("_id");

            query.$or = [
                { remark: { $regex: trimmedSearch, $options: "i" } },
                { deliveryBoy: { $in: matchingDeliveryBoys.map((boy) => boy._id) } },
            ];
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const sort: any = {};
        sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

        const [collections, total, pendingSummary] = await Promise.all([
            CashCollection.find(query)
                .populate("deliveryBoy", "name mobile cashCollected")
                .populate("order", "orderNumber total")
                .populate("collectedBy", "name")
                .populate("reviewedBy", "name")
                .populate("settledOrders.order", "orderNumber total")
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit as string)),
            CashCollection.countDocuments(query),
            CashCollection.aggregate([
                { $match: { status: "Pending" } },
                { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
            ]),
        ]);

        // Transform data to match frontend expectations
        const transformedCollections = collections.map((collection: any) => ({
            _id: collection._id,
            deliveryBoyId: collection.deliveryBoy?._id,
            deliveryBoyName: collection.deliveryBoy?.name || "Unknown",
            deliveryBoyMobile: collection.deliveryBoy?.mobile || "",
            deliveryBoyCashCollected: collection.deliveryBoy?.cashCollected || 0,
            orderId: collection.order?._id,
            total: collection.order?.total || 0,
            amount: collection.amount,
            remark: collection.remark,
            paymentMethod: collection.paymentMethod || 'cash',
            status: effectiveStatus(collection),
            rejectionReason: collection.rejectionReason,
            reviewedBy: collection.reviewedBy?.name,
            reviewedAt: collection.reviewedAt,
            settledOrders: (collection.settledOrders || []).map((s: any) => ({
                orderId: s.order?._id,
                orderNumber: s.order?.orderNumber,
                orderTotal: s.order?.total,
                amount: s.amount,
            })),
            collectedAt: collection.collectedAt,
            collectedBy:
                collection.collectedBy?.name ||
                (['razorpay', 'HDFC'].includes(collection.paymentMethod)
                    ? "App Payment"
                    : "Delivery Boy Cash Handover"),
        }));

        return res.status(200).json({
            success: true,
            message: "Cash collections fetched successfully",
            data: transformedCollections,
            summary: {
                pendingCount: pendingSummary[0]?.count || 0,
                pendingAmount: round2(pendingSummary[0]?.amount || 0),
            },
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    }
);

/**
 * Get cash collection by ID
 */
export const getCashCollectionById = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const collection = await CashCollection.findById(id)
            .populate("deliveryBoy", "name mobile")
            .populate("order", "orderNumber total")
            .populate("collectedBy", "name")
            .populate("settledOrders.order", "orderNumber total");

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: "Cash collection not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cash collection fetched successfully",
            data: collection,
        });
    }
);

/**
 * Create cash collection (admin received cash directly; settles immediately)
 */
export const createCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { deliveryBoyId, orderId, amount, remark } = req.body;
        const settlementAmount = round2(Number(amount));

        if (!deliveryBoyId || !settlementAmount || settlementAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Delivery boy ID and amount are required",
            });
        }

        // Verify delivery boy exists
        const deliveryBoy = await Delivery.findById(deliveryBoyId);
        if (!deliveryBoy) {
            return res.status(404).json({
                success: false,
                message: "Delivery boy not found",
            });
        }

        const pendingAmount = await getPendingHandoverAmount(deliveryBoyId);
        const available = round2((deliveryBoy.cashCollected || 0) - pendingAmount);
        if (settlementAmount > available + 0.001) {
            return res.status(400).json({
                success: false,
                message: pendingAmount > 0
                    ? `Amount cannot exceed ₹${Math.max(0, available).toFixed(2)}. ₹${pendingAmount.toFixed(2)} is in pending handover requests — approve those instead.`
                    : "Amount cannot exceed current cash in hand",
            });
        }

        // Verify order exists when provided
        if (orderId) {
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found",
                });
            }
        }

        let collectionId: mongoose.Types.ObjectId;
        try {
            collectionId = await runInTransaction(async (session) => {
                const { settledOrders } = await settleDeliveryBoyCash(deliveryBoyId, settlementAmount, session);
                const [collection] = await CashCollection.create([{
                    deliveryBoy: deliveryBoyId,
                    order: orderId || undefined,
                    amount: settlementAmount,
                    remark,
                    status: "Approved",
                    settlementApplied: true,
                    settledOrders,
                    collectedBy: req.user?.userId,
                    reviewedBy: req.user?.userId,
                    reviewedAt: new Date(),
                    collectedAt: new Date(),
                }], { session });
                await logCashSettlement(
                    deliveryBoyId,
                    settlementAmount,
                    `Cash settled by Admin. Remark: ${remark || 'N/A'}`,
                    `CC-${collection._id}`,
                    session
                );
                return collection._id;
            });
        } catch (error: any) {
            if (error instanceof SettlementError) {
                return res.status(400).json({ success: false, message: error.message });
            }
            throw error;
        }

        const populatedCollection = await CashCollection.findById(collectionId)
            .populate("deliveryBoy", "name mobile")
            .populate("order", "orderNumber total")
            .populate("collectedBy", "name");

        return res.status(201).json({
            success: true,
            message: "Cash collection created successfully",
            data: populatedCollection,
        });
    }
);

/**
 * Approve a delivery boy's cash handover request
 */
export const approveCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const adminId = req.user?.userId;

        const collection = await CashCollection.findById(id);
        if (!collection) {
            return res.status(404).json({ success: false, message: "Cash collection not found" });
        }
        if (collection.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `This request is already ${effectiveStatus(collection).toLowerCase()}.`,
            });
        }

        const deliveryBoyId = collection.deliveryBoy.toString();
        let result: { cashCollected: number; settledOrders: any[] };
        try {
            result = await runInTransaction(async (session) => {
                const claimed = await CashCollection.findOneAndUpdate(
                    { _id: id, status: "Pending" },
                    {
                        $set: {
                            status: "Approved",
                            settlementApplied: true,
                            collectedBy: adminId,
                            reviewedBy: adminId,
                            reviewedAt: new Date(),
                        },
                    },
                    { new: true, session }
                );
                if (!claimed) {
                    throw new SettlementError("This request has already been processed.");
                }

                const { deliveryBoy, settledOrders } = await settleDeliveryBoyCash(
                    deliveryBoyId,
                    claimed.amount,
                    session
                );
                claimed.settledOrders = settledOrders as any;
                await claimed.save({ session });

                await logCashSettlement(
                    deliveryBoyId,
                    claimed.amount,
                    `Cash handover approved by Admin. Remark: ${claimed.remark || 'N/A'}`,
                    claimed.requestKey || `CC-${claimed._id}`,
                    session
                );

                return { cashCollected: deliveryBoy.cashCollected, settledOrders };
            });
        } catch (error: any) {
            if (error instanceof SettlementError) {
                return res.status(400).json({ success: false, message: error.message });
            }
            throw error;
        }

        try {
            const { sendNotification } = await import("../../../services/notificationService");
            await sendNotification(
                "Delivery",
                deliveryBoyId,
                "Cash Handover Approved",
                `Admin approved your cash handover of ₹${collection.amount.toFixed(2)}.`,
                { type: "Payment", link: "/delivery/wallet" }
            );
        } catch (notifyError) {
            console.error("Error notifying delivery boy of approval:", notifyError);
        }

        return res.status(200).json({
            success: true,
            message: "Cash handover approved and settled",
            data: {
                collectionId: id,
                status: "Approved",
                deliveryBoyCashCollected: result.cashCollected,
                settledOrdersCount: result.settledOrders.length,
            },
        });
    }
);

/**
 * Reject a delivery boy's cash handover request (cash stays with the delivery boy)
 */
export const rejectCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

        const collection = await CashCollection.findOneAndUpdate(
            { _id: id, status: "Pending" },
            {
                $set: {
                    status: "Rejected",
                    settlementApplied: false,
                    rejectionReason: reason || "Cash not received",
                    reviewedBy: req.user?.userId,
                    reviewedAt: new Date(),
                },
            },
            { new: true }
        );

        if (!collection) {
            const exists = await CashCollection.findById(id).select("status");
            return res.status(exists ? 400 : 404).json({
                success: false,
                message: exists
                    ? `This request is already ${effectiveStatus(exists).toLowerCase()}.`
                    : "Cash collection not found",
            });
        }

        try {
            const { sendNotification } = await import("../../../services/notificationService");
            await sendNotification(
                "Delivery",
                collection.deliveryBoy.toString(),
                "Cash Handover Rejected",
                `Admin rejected your cash handover of ₹${collection.amount.toFixed(2)}. Reason: ${collection.rejectionReason}`,
                { type: "Warning", link: "/delivery/wallet" }
            );
        } catch (notifyError) {
            console.error("Error notifying delivery boy of rejection:", notifyError);
        }

        return res.status(200).json({
            success: true,
            message: "Cash handover rejected",
            data: { collectionId: id, status: "Rejected" },
        });
    }
);

/**
 * Update cash collection (only pending requests can change amount)
 */
export const updateCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { amount, remark } = req.body;

        const collection = await CashCollection.findById(id);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: "Cash collection not found",
            });
        }

        if (amount !== undefined && Number(amount) !== collection.amount) {
            if (collection.status !== "Pending") {
                return res.status(400).json({
                    success: false,
                    message: "Amount of a settled or rejected collection cannot be changed",
                });
            }
            if (!(Number(amount) > 0)) {
                return res.status(400).json({ success: false, message: "Invalid amount" });
            }
            collection.amount = round2(Number(amount));
        }

        if (remark !== undefined) {
            collection.remark = remark;
        }

        await collection.save();

        const updatedCollection = await CashCollection.findById(id)
            .populate("deliveryBoy", "name mobile")
            .populate("order", "orderNumber total")
            .populate("collectedBy", "name");

        return res.status(200).json({
            success: true,
            message: "Cash collection updated successfully",
            data: updatedCollection,
        });
    }
);

/**
 * Delete cash collection (settled collections cannot be deleted)
 */
export const deleteCashCollection = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const collection = await CashCollection.findById(id);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: "Cash collection not found",
            });
        }

        if (effectiveStatus(collection) === "Approved") {
            return res.status(400).json({
                success: false,
                message: "Approved collections are already settled and cannot be deleted",
            });
        }

        await CashCollection.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Cash collection deleted successfully",
        });
    }
);
