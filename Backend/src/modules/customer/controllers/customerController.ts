import { Request, Response } from "express";
import Customer from "../../../models/Customer";
import Address from "../../../models/Address";
import Cart from "../../../models/Cart";
import CartItem from "../../../models/CartItem";
import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import Wishlist from "../../../models/Wishlist";
import Review from "../../../models/Review";
import Payment from "../../../models/Payment";
import WalletTransaction from "../../../models/WalletTransaction";
import Notification from "../../../models/Notification";
import Return from "../../../models/Return";
import Refund from "../../../models/Refund";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSmsOtp, verifySmsOtp } from "../../../services/otpService";

/**
 * Get customer profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId || (req as any).user?.userType !== "Customer") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or not a customer",
    });
  }

  const customer = await Customer.findById(userId);

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      dateOfBirth: customer.dateOfBirth,
      registrationDate: customer.registrationDate,
      status: customer.status,
      refCode: customer.refCode,
      walletAmount: customer.walletAmount,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      location: customer.location,
    },
  });
});

/**
 * Update customer profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { name, email, address, dateOfBirth, notificationPreferences, accountPrivacy } = req.body;


    if (!userId || (req as any).user?.userType !== "Customer") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or not a customer",
      });
    }

    const customer = await Customer.findById(userId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update fields if provided
    if (name) customer.name = name;
    if (address) {
      if (!customer.location) {
        customer.location = {
          address: address,
          type: 'Point',
          coordinates: [0, 0]
        };
      } else {
        customer.location.address = address;
      }
    }
    if (email) {
      // Check if email is already taken by another customer
      const existingCustomer = await Customer.findOne({
        email,
        _id: { $ne: userId },
      });

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another customer",
        });
      }

      customer.email = email;
    }
    if (dateOfBirth) customer.dateOfBirth = new Date(dateOfBirth);
    if (notificationPreferences) customer.notificationPreferences = { ...customer.notificationPreferences, ...notificationPreferences };
    if (accountPrivacy) customer.accountPrivacy = { ...customer.accountPrivacy, ...accountPrivacy };


    await customer.save();

    // If an address was provided, also ensure it exists in the Address collection
    if (address) {
      const addressCount = await Address.countDocuments({ customer: userId });
      if (addressCount === 0) {
        await Address.create({
          customer: userId,
          fullName: customer.name,
          phone: customer.phone,
          address: address,
          city: 'Default City', // Placeholder for mandatory field
          pincode: '000000',    // Placeholder for mandatory field
          type: 'Home',
          isDefault: true,
          latitude: customer.location?.latitude,
          longitude: customer.location?.longitude
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        dateOfBirth: customer.dateOfBirth,
        registrationDate: customer.registrationDate,
        status: customer.status,
        refCode: customer.refCode,
        walletAmount: customer.walletAmount,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        location: customer.location,
        notificationPreferences: customer.notificationPreferences,
        accountPrivacy: customer.accountPrivacy,
        donationStats: customer.donationStats,
      },

    });
  }
);

/**
 * Update customer location
 */
export const updateLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { latitude, longitude, address, city, state, pincode } = req.body;

    if (!userId || (req as any).user?.userType !== "Customer") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or not a customer",
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const customer = await Customer.findById(userId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update location field nested object and unset legacy top-level fields
    const updatedCustomer = await Customer.findByIdAndUpdate(
      userId,
      {
        $set: {
          location: {
            latitude,
            longitude,
            address,
            city,
            state,
            pincode,
            type: 'Point',
            coordinates: [longitude, latitude], // MongoDB expects [lng, lat] for 2dsphere
            updatedAt: new Date(),
          }
        },
        $unset: {
          address: 1,
          city: 1,
          state: 1,
          pincode: 1,
          latitude: 1,
          longitude: 1,
          locationUpdatedAt: 1
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found after update",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        location: updatedCustomer.location
      },
    });
  }
);

/**
 * Get customer location
 */
export const getLocation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId || (req as any).user?.userType !== "Customer") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or not a customer",
    });
  }

  const customer = await Customer.findById(userId);

  if (!customer || !customer.location) {
    return res.status(404).json({
      success: false,
      message: "Location not found for this user",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Location retrieved successfully",
    data: {
      location: customer.location,
    },
  });
});

/**
 * Request account deletion OTP
 */
export const requestDeleteAccountOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { phone } = req.body;

    if (!userId || (req as any).user?.userType !== "Customer") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or not a customer",
      });
    }

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10-digit phone number is required",
      });
    }

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.phone !== phone) {
      return res.status(400).json({
        success: false,
        message: "The phone number does not match your account",
      });
    }

    // Send SMS OTP
    await sendSmsOtp(phone, "Customer");

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your registered mobile number",
    });
  }
);

/**
 * Confirm account deletion
 */
export const confirmDeleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { phone, otp } = req.body;

    if (!userId || (req as any).user?.userType !== "Customer") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or not a customer",
      });
    }

    if (!otp || !/^[0-9]{4}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Valid 4-digit OTP is required",
      });
    }

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Verify OTP
    const isValid = await verifySmsOtp(`DB_VERIFIED_${phone}`, otp, phone, "Customer");
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // --- DELETE ALL DATA ---
    
    // Delete Cart and CartItems
    const cart = await Cart.findOne({ customerId: userId });
    if (cart) {
      await CartItem.deleteMany({ cartId: cart._id });
      await Cart.deleteOne({ _id: cart._id });
    }

    // Delete Orders and OrderItems
    const orders = await Order.find({ customerId: userId });
    const orderIds = orders.map(o => o._id);
    await OrderItem.deleteMany({ orderId: { $in: orderIds } });
    await Order.deleteMany({ customerId: userId });

    // Delete other related records
    await Address.deleteMany({ customerId: userId });
    await Wishlist.deleteMany({ customerId: userId });
    await Review.deleteMany({ customerId: userId });
    await Payment.deleteMany({ customerId: userId });
    await WalletTransaction.deleteMany({ customerId: userId });
    await Notification.deleteMany({ customerId: userId });
    await Return.deleteMany({ customerId: userId });
    await Refund.deleteMany({ customerId: userId });

    // Finally, delete the Customer record
    await Customer.deleteOne({ _id: userId });

    return res.status(200).json({
      success: true,
      message: "Your account and all associated data have been permanently deleted.",
    });
  }
);

