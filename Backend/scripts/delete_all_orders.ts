import connectDB from '../src/config/db';
import mongoose from 'mongoose';
import Order from '../src/models/Order';
import OrderItem from '../src/models/OrderItem';
import DeliveryAssignment from '../src/models/DeliveryAssignment';
import DeliveryTracking from '../src/models/DeliveryTracking';

async function deleteAllOrders() {
  try {
    await connectDB();
    
    console.log('Deleting all OrderItems...');
    const orderItemsResult = await OrderItem.deleteMany({});
    console.log(`Deleted ${orderItemsResult.deletedCount} OrderItems.`);

    console.log('Deleting all Orders...');
    const ordersResult = await Order.deleteMany({});
    console.log(`Deleted ${ordersResult.deletedCount} Orders.`);
    
    console.log('Deleting all DeliveryAssignments...');
    const assignmentsResult = await DeliveryAssignment.deleteMany({});
    console.log(`Deleted ${assignmentsResult.deletedCount} DeliveryAssignments.`);

    console.log('Deleting all DeliveryTrackings...');
    const trackingsResult = await DeliveryTracking.deleteMany({});
    console.log(`Deleted ${trackingsResult.deletedCount} DeliveryTrackings.`);
    
    console.log('Successfully deleted all order data.');
  } catch (error) {
    console.error('Error deleting orders:', error);
  } finally {
    mongoose.connection.close();
  }
}

deleteAllOrders();
