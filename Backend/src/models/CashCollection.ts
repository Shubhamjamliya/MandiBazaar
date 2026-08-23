import { Schema, model, Document, Types } from "mongoose";

export interface ICashCollection extends Document {
    deliveryBoy: Types.ObjectId;
    order?: Types.ObjectId;
    amount: number;
    remark?: string;
    paymentMethod: 'cash' | 'razorpay' | 'HDFC';
    requestKey?: string;
    settlementApplied?: boolean;
    collectedBy?: Types.ObjectId;
    collectedAt: Date;
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
        settlementApplied: {
            type: Boolean,
            default: true,
        },
        collectedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
        },
        collectedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
cashCollectionSchema.index({ deliveryBoy: 1, collectedAt: -1 });
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
