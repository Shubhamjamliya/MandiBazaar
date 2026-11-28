import Notification from "../models/Notification";
import Admin from "../models/Admin";
import Seller from "../models/Seller";
import Customer from "../models/Customer";
import Delivery from "../models/Delivery";
import { sendNotificationToUser, sendPushNotification } from "./firebaseAdmin";

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
    const pushResult = await sendNotificationToUser(recipientId, recipientType, {
      title,
      body: message,
      data: {
        type: options?.type || "Info",
        link: options?.link || "",
        notificationId: notification._id.toString(),
        ...(options?.data || {})
      },
    });
    
    // Update sent status only if push was actually sent
    if (pushResult && (pushResult.successCount > 0 || pushResult.failureCount > 0)) {
      notification.sentAt = new Date();
    } else {
      console.warn(`⚠️  No push delivery confirmation for notification ${notification._id}`);
    }
  } catch (error) {
    console.error(`❌ Error sending push notification for ${notification._id}:`, error);
  }

  await notification.save();

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
  orderId: string,
) => {
  return sendNotification(
    "Delivery",
    deliveryId,
    "🚚 New Task Available",
    `A new delivery task #${orderNo} is available near you.`,
    {
      type: "Order",
      priority: "High",
      link: `/delivery/orders/notification/${orderId}`,
      actionLabel: "View Task",
      data: {
        eventType: "new-order",
        orderId,
        orderNumber: orderNo,
        sound: "default",
      },
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

/**
 * Push an announcement to every registered device of one audience (or all of them).
 *
 * Unlike sendBroadcastNotification this does NOT write a Notification row per user -
 * an admin announcement is a single record, and fanning it out per user would both
 * flood the collection and fire one FCM call per recipient. Tokens are collected in
 * bulk and handed to the batching sender instead.
 */
export const sendAudiencePushNotification = async (
  audience: "All" | "Admin" | "Seller" | "Customer" | "Delivery",
  title: string,
  message: string,
  options?: {
    type?: string;
    link?: string;
    notificationId?: string;
    data?: { [key: string]: string };
  },
) => {
  const models: Record<string, any> = {
    Admin,
    Seller,
    Customer,
    Delivery,
  };

  const roles =
    audience === "All"
      ? ["Admin", "Seller", "Customer", "Delivery"]
      : [audience];

  const stats = {
    recipients: 0,
    tokensTargeted: 0,
    successCount: 0,
    failureCount: 0,
    perRole: {} as Record<
      string,
      { recipients: number; tokens: number; success: number; failed: number }
    >,
    errors: [] as string[],
  };

  for (const role of roles) {
    const UserModel = models[role];
    const roleStats = { recipients: 0, tokens: 0, success: 0, failed: 0 };
    stats.perRole[role] = roleStats;

    const users = await UserModel.find({
      $or: [
        { fcmTokens: { $exists: true, $not: { $size: 0 } } },
        { fcmTokenMobile: { $exists: true, $not: { $size: 0 } } },
      ],
    }).select("_id fcmTokens fcmTokenMobile");

    const tokens = [
      ...new Set(
        users.flatMap((u: any) => [
          ...(u.fcmTokens || []),
          ...(u.fcmTokenMobile || []),
        ]),
      ),
    ].filter((t): t is string => typeof t === "string" && t.trim().length > 0);

    roleStats.recipients = users.length;
    roleStats.tokens = tokens.length;
    stats.recipients += users.length;
    stats.tokensTargeted += tokens.length;

    if (tokens.length === 0) {
      console.log(`No registered devices for ${role}, skipping push`);
      continue;
    }

    try {
      const response = await sendPushNotification(tokens, {
        title,
        body: message,
        data: {
          type: options?.type || "Info",
          link: options?.link || "",
          notificationId: options?.notificationId || "",
          recipientType: role,
          ...(options?.data || {}),
        },
      });

      roleStats.success = response.successCount;
      roleStats.failed = response.failureCount;
      stats.successCount += response.successCount;
      stats.failureCount += response.failureCount;

      // Drop tokens FCM told us are dead, so the next broadcast is not dragged
      // down by devices that uninstalled or rotated their registration.
      const sentTokens: string[] = response.tokens || tokens;
      const invalidTokens: string[] = [];
      (response.responses || []).forEach((resp: any, idx: number) => {
        if (resp.success || !sentTokens[idx]) return;
        const errorCode = resp.error?.code;
        const errorMsg = resp.error?.message;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/mismatched-credential" ||
          errorMsg?.includes("SenderId mismatch") ||
          errorMsg?.includes("not a valid FCM registration token")
        ) {
          invalidTokens.push(sentTokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await UserModel.updateMany(
          {
            $or: [
              { fcmTokens: { $in: invalidTokens } },
              { fcmTokenMobile: { $in: invalidTokens } },
            ],
          },
          {
            $pull: {
              fcmTokens: { $in: invalidTokens },
              fcmTokenMobile: { $in: invalidTokens },
            },
          },
        );
        console.log(
          `Removed ${invalidTokens.length} dead token(s) for ${role}`,
        );
      }
    } catch (error: any) {
      const reason = error?.message || "Unknown push error";
      roleStats.failed = tokens.length;
      stats.failureCount += tokens.length;
      stats.errors.push(`${role}: ${reason}`);
      console.error(`Broadcast push failed for ${role}:`, reason);
    }
  }

  return stats;
};
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
    const pushResult = await sendNotificationToUser(recipientId, recipientType, {
      title,
      body: message,
      data: {
        type: options?.type || "Info",
        link: options?.link || "",
        notificationId: notification._id.toString(),
        ...(options?.data || {})
      },
    });
    
    // Update sent status only if push was actually sent
    if (pushResult && (pushResult.successCount > 0 || pushResult.failureCount > 0)) {
      notification.sentAt = new Date();
    } else {
      console.warn(`⚠️  No push delivery confirmation for notification ${notification._id}`);
    }
  } catch (error) {
    console.error(`❌ Error sending push notification for ${notification._id}:`, error);
  }

  await notification.save();

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
  orderId: string,
) => {
  return sendNotification(
    "Delivery",
    deliveryId,
    "🚚 New Task Available",
    `A new delivery task #${orderNo} is available near you.`,
    {
      type: "Order",
      priority: "High",
      link: `/delivery/orders/${orderId}`,
      actionLabel: "View Task",
      data: {
        eventType: "new-order",
        orderId,
        orderNumber: orderNo,
        sound: "default",
      },
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

