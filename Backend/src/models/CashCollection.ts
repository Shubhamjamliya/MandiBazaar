import { Schema, model, Document, Types } from "mongoose";

export type CashCollectionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ICashCollection extends Document {
    deliveryBoy: Types.ObjectId;
    order?: Types.ObjectId;
    amount: number;
    remark?: string;
    paymentMethod: 'cash' | 'razorpay' | 'HDFC';
    requestKey?: string;
    status: CashCollectionStatus;
    settlementApplied?: boolean;
    settledOrders: { order: Types.ObjectId; amount: number }[];
    collectedBy?: Types.ObjectId;
    collectedAt: Date;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const cashCollectionSchema = new Schema<ICashCollection>(
    {
        deliveryBoy: {
            type: Schema.Types.ObjectId,
            ref: "Delivery",
            required: [true, "Delivery boy is required"],
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: "Order",
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0, "Amount cannot be negative"],
        },
        remark: {
            type: String,
            trim: true,
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'razorpay', 'HDFC'],
            default: 'cash',
        },
        requestKey: {
            type: String,
            trim: true,
        },
        // Records created before the approval flow existed have no status and count as Approved.
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Approved',
        },
        settlementApplied: {
            type: Boolean,
            default: true,
        },
        settledOrders: [
            {
                _id: false,
                order: { type: Schema.Types.ObjectId, ref: "Order" },
                amount: { type: Number },
            },
        ],
        collectedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
        },
        collectedAt: {
            type: Date,
            default: Date.now,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
        },
        reviewedAt: {
            type: Date,
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
cashCollectionSchema.index({ deliveryBoy: 1, collectedAt: -1 });
cashCollectionSchema.index({ deliveryBoy: 1, status: 1 });
cashCollectionSchema.index({ order: 1 });
cashCollectionSchema.index({ collectedAt: -1 });
cashCollectionSchema.index(
    { requestKey: 1 },
    {
        unique: true,
        partialFilterExpression: { requestKey: { $exists: true, $type: "string" } },
    }
);

const CashCollection = model<ICashCollection>(
    "CashCollection",
    cashCollectionSchema
);

export default CashCollection;
