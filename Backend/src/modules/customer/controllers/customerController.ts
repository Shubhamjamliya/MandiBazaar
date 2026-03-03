import { Request, Response } from "express";
import Customer from "../../../models/Customer";
import { asyncHandler } from "../../../utils/asyncHandler";

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
      latitude: customer.location?.latitude,
      longitude: customer.location?.longitude,
      address: customer.location?.address,
      city: customer.location?.city,
      state: customer.location?.state,
      pincode: customer.location?.pincode,
      locationUpdatedAt: customer.location?.updatedAt,
    },
  });
});

/**
 * Update customer profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { name, email, dateOfBirth, notificationPreferences, accountPrivacy } = req.body;


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
        latitude: customer.location?.latitude,
        longitude: customer.location?.longitude,
        address: customer.location?.address,
        city: customer.location?.city,
        state: customer.location?.state,
        pincode: customer.location?.pincode,
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

    // Update location field nested object
    customer.location = {
      latitude,
      longitude,
      address,
      city,
      state,
      pincode,
      type: 'Point',
      coordinates: [longitude, latitude], // MongoDB expects [lng, lat] for 2dsphere
      updatedAt: new Date(),
    };

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        latitude: customer.location.latitude,
        longitude: customer.location.longitude,
        address: customer.location.address,
        city: customer.location.city,
        state: customer.location.state,
        pincode: customer.location.pincode,
        locationUpdatedAt: customer.location.updatedAt,
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
      latitude: customer.location.latitude,
      longitude: customer.location.longitude,
      address: customer.location.address,
      city: customer.location.city,
      state: customer.location.state,
      pincode: customer.location.pincode,
      locationUpdatedAt: customer.location.updatedAt,
    },
  });
});
