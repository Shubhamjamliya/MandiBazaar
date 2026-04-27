import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import mongoose from 'mongoose';

/**
 * Restores stock for all items in an order and marks the order as Cancelled.
 */
export const restoreStockAndCancelOrder = async (orderId: string, reason: string = 'Payment failed or cancelled') => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        // Only restore if not already restored/cancelled
        if (order.status === 'Cancelled') {
            await session.abortTransaction();
            return { success: true, message: 'Order already cancelled' };
        }

        const orderItems = await OrderItem.find({ order: orderId }).session(session);
        
        for (const item of orderItems) {
            if (item.status === 'Cancelled') continue;

            const product = await Product.findById(item.product).session(session);
            if (product) {
                const qty = item.quantity || 0;
                
                // Restore variation stock if applicable
                if (item.variation) {
                    const variationValue = item.variation;
                    const isWeightVariant = typeof variationValue === 'string' && variationValue.startsWith('wv_');
                    const weightLabel = isWeightVariant ? variationValue.replace('wv_', '') : variationValue;

                    if (isWeightVariant && product.weightVariants) {
                        const variantIndex = product.weightVariants.findIndex((v: any) => v.label === weightLabel);
                        if (variantIndex !== -1) {
                            product.weightVariants[variantIndex].stock += qty;
                        }
                    } else if (product.variations) {
                        const variationIndex = product.variations.findIndex((v: any) => 
                            (v._id && v._id.toString() === variationValue) ||
                            v.value === variationValue ||
                            v.title === variationValue ||
                            v.pack === variationValue
                        );
                        if (variationIndex !== -1) {
                            product.variations[variationIndex].stock += qty;
                        } else if (product.variations.length > 0) {
                            product.variations[0].stock += qty;
                        }
                    }
                }

                // Restore main stock
                product.stock += qty;
                await product.save({ session });
            }

            item.status = 'Cancelled';
            await item.save({ session });
        }

        order.status = 'Cancelled';
        order.paymentStatus = 'Failed';
        order.cancellationReason = reason;
        order.cancelledAt = new Date();
        await order.save({ session });

        await session.commitTransaction();
        console.log(`Stock restored and order ${orderId} cancelled due to: ${reason}`);
        return { success: true };
    } catch (error: any) {
        await session.abortTransaction();
        console.error(`Error restoring stock for order ${orderId}:`, error);
        return { success: false, error: error.message };
    } finally {
        session.endSession();
    }
};
