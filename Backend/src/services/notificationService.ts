import Notification from "../models/Notification";
import Admin from "../models/Admin";
import Seller from "../models/Seller";
import Customer from "../models/Customer";
import Delivery from "../models/Delivery";
import { sendNotificationToUser } from "./firebaseAdmin";

/**
 * Send notification to specific user
 */
export const sendNotification = async (
  recipientType: "Admin" | "Seller" | "Customer" | "Delivery",
  recipientId: string,
  title: string,
  message: string,
  options?: {
    type?:
      | "Info"
      | "Success"
      | "Warning"
      | "Error"
      | "Order"
      | "Payment"
      | "System";
    link?: string;
    actionLabel?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    expiresAt?: Date;
    data?: { [key: string]: string };
  },
) => {
  // Create database record
  const notification = await Notification.create({
    recipientType,
    recipientId,
    title,
    message,
    type: options?.type || "Info",
    link: options?.link,
    actionLabel: options?.actionLabel,
    priority: options?.priority || "Medium",
    expiresAt: options?.expiresAt,
    isRead: false,
  });

  // Send push notification via FCM
  try {
    await sendNotificationToUser(recipientId, recipientType, {
      title,
      body: message,
      data: options?.data || {
        type: options?.type || "Info",
        link: options?.link || "",
        notificationId: notification._id.toString()
      },
    });
    
    // Update sent status
    notification.sentAt = new Date();
    await notification.save();
  } catch (error) {
    console.error("Error sending push notification:", error);
  }

  return notification;
};

/**
 * Send notification to all users of a type
 */
export const sendBroadcastNotification = async (
  recipientType: "Admin" | "Seller" | "Customer" | "Delivery",
  title: string,
  message: string,
  options?: {
    type?:
      | "Info"
      | "Success"
      | "Warning"
      | "Error"
      | "Order"
      | "Payment"
      | "System";
    link?: string;
    actionLabel?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    expiresAt?: Date;
  },
) => {
  // Get all users of the specified type
  let userIds: string[] = [];

  switch (recipientType) {
    case "Admin":
      const admins = await Admin.find().select("_id");
      userIds = admins.map((a) => a._id.toString());
      break;
    case "Seller":
      const sellers = await Seller.find().select("_id");
      userIds = sellers.map((s) => s._id.toString());
      break;
    case "Customer":
      const customers = await Customer.find().select("_id");
      userIds = customers.map((c) => c._id.toString());
      break;
    case "Delivery":
      const deliveries = await Delivery.find().select("_id");
      userIds = deliveries.map((d) => d._id.toString());
      break;
  }

  // Create notifications and send push for all users
  const notifications = await Promise.all(
    userIds.map((userId) => sendNotification(recipientType, userId, title, message, options))
  );

  return notifications;
};

/**
 * Send order status notification to Customer
 */
export const sendCustomerOrderNotification = async (
  orderId: string,
  orderNo: string,
  customerId: string,
  total: number,
  status: string,
) => {
  const statusConfig: Record<string, { title: string; message: string; priority: any }> = {
    Processed: {
      title: "Order Confirmed!",
      message: `Your order #${orderNo} for ₹${total} is confirmed.`,
      priority: "Medium",
    },
    Shipped: {
      title: "Out for Delivery",
      message: `Your order #${orderNo} is on its way.`,
      priority: "Medium",
    },
    "Out for Delivery": {
      title: "Out for Delivery",
      message: `Your order #${orderNo} is out for delivery with our partner.`,
      priority: "High",
    },
    Delivered: {
      title: "Freshness Delivered!",
      message: `Hope you enjoy your veggies! Rate your experience for order #${orderNo}.`,
      priority: "Medium",
    },
    Cancelled: {
      title: "Order Cancelled",
      message: `Order #${orderNo} was cancelled. Refund processed to wallet.`,
      priority: "High",
    },
  };

  const config = statusConfig[status];
  if (!config) return;

  return sendNotification(
    "Customer",
    customerId,
    config.title,
    config.message,
    {
      type: "Order",
      link: `/orders/${orderId}`,
      priority: config.priority,
      data: { orderId, orderNo, status }
    },
  );
};

/**
 * Send cashback notification to Customer
 */
export const sendCashbackNotification = async (
  customerId: string,
  amount: number,
) => {
  return sendNotification(
    "Customer",
    customerId,
    "Cashback Received!",
    `₹${amount} added to your wallet!`,
    {
      type: "Payment",
      link: "/wallet",
      priority: "Medium",
    },
  );
};

/**
 * Send new order notification to Seller
 */
export const sendSellerNewOrderNotification = async (
  sellerId: string,
  orderId: string,
  orderNo: string,
  amount: number,
) => {
  return sendNotification(
    "Seller",
    sellerId,
    "✨ New Order!",
    `You received a new order #${orderNo} for ₹${amount}.`,
    {
      type: "Order",
      link: `/seller/orders/${orderId}`,
      priority: "High",
      data: { orderId, orderNo }
    },
  );
};

/**
 * Send order cancellation notification to Seller
 */
export const sendSellerOrderCancelledNotification = async (
  sellerId: string,
  orderNo: string,
  customerName: string,
) => {
  return sendNotification(
    "Seller",
    sellerId,
    "Order Cancelled",
    `${customerName} cancelled order #${orderNo}.`,
    {
      type: "Order",
      priority: "High",
    },
  );
};

/**
 * Send product status notification to Seller
 */
export const sendProductStatusNotification = async (
  sellerId: string,
  productId: string,
  status: "Approved" | "Rejected",
  reason?: string,
) => {
  const title = status === "Approved" ? "Product Approved" : "Product Rejected";
  const message = status === "Approved" 
    ? "Your product has been approved and is now live on the platform." 
    : `Your product has been rejected. Reason: ${reason || "Not specified"}`;

  return sendNotification(
    "Seller",
    sellerId,
    title,
    message,
    {
      type: status === "Approved" ? "Success" : "Error",
      link: `/seller/products/${productId}`,
      priority: "Medium",
    },
  );
};

/**
 * Send stock alert to Seller
 */
export const sendStockAlertNotification = async (
  sellerId: string,
  productName: string,
  count: number,
) => {
  return sendNotification(
    "Seller",
    sellerId,
    "Stock Alert",
    `Product "${productName}" is low on stock (${count} left).`,
    {
      type: "Warning",
      priority: "High",
    },
  );
};

/**
 * Send withdrawal status notification
 */
export const sendWithdrawalStatusNotification = async (
  recipientId: string,
  recipientType: "Seller" | "Delivery",
  amount: number,
  status: "Approved" | "Rejected" | "Completed",
  reason?: string,
) => {
  const config = {
    Approved: {
      title: "Withdrawal Approved",
      message: `Your withdrawal of ₹${amount} has been approved and will be processed soon.`,
    },
    Rejected: {
      title: "Withdrawal Rejected",
      message: `Your withdrawal of ₹${amount} was rejected. Reason: ${reason || "Not specified"}`,
    },
    Completed: {
      title: "Withdrawal Completed",
      message: `Your withdrawal of ₹${amount} has been processed successfully.`,
    },
  };

  const statusConfig = config[status];
  
  return sendNotification(
    recipientType,
    recipientId,
    statusConfig.title,
    statusConfig.message,
    {
      type: status === "Rejected" ? "Error" : "Success",
      priority: "Medium",
    },
  );
};

/**
 * Send new task available notification to Delivery Partner
 */
export const sendDeliveryTaskNotification = async (
  deliveryId: string,
  orderNo: string,
) => {
  return sendNotification(
    "Delivery",
    deliveryId,
    "🚚 New Task Available",
    `A new delivery task #${orderNo} is available near you.`,
    {
      type: "Order",
      priority: "High",
    },
  );
};

/**
 * Send new registration notification to Admin
 */
export const sendAdminNewRegistrationNotification = async (
  storeName: string,
) => {
  return sendBroadcastNotification(
    "Admin",
    "New Registration",
    `New seller "${storeName}" has registered.`,
    {
      type: "System",
      priority: "Medium",
    },
  );
};

/**
 * Send payout request notification to Admin
 */
export const sendAdminPayoutRequestNotification = async (
  name: string,
  amount: number,
) => {
  return sendBroadcastNotification(
    "Admin",
    "Payout Request",
    `${name} requested a withdrawal of ₹${amount}.`,
    {
      type: "Payment",
      priority: "Medium",
    },
  );
};

/**
 * Send test notification
 */
export const sendTestNotification = async (
  recipientId: string,
  recipientType: "Admin" | "Seller" | "Customer" | "Delivery",
) => {
  return sendNotification(
    recipientType,
    recipientId,
    "🔔 Test Notification",
    "This is a test push notification from Apna Sabji Wala!",
    {
      type: "System",
      priority: "Low",
    },
  );
};

