import { Request, Response } from "express";
import Seller from "../../../models/Seller";
import {
  sendOTP as sendOTPService,
  verifyOTP as verifyOTPService,
} from "../../../services/otpService";
import { generateToken } from "../../../services/jwtService";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Send OTP to seller mobile number
 */
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { mobile } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Check if seller exists with this mobile
  const seller = await Seller.findOne({ mobile });
  if (!seller) {
    return res.status(404).json({
      success: false,
      message: "Seller not found with this mobile number",
    });
  }

  // Send OTP - for login, always use default OTP
  const result = await sendOTPService(mobile, "Seller", true);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Verify OTP and login seller
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, otp } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  if (!otp || !/^[0-9]{4}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "Valid 4-digit OTP is required",
    });
  }

  // Verify OTP
  const isValid = await verifyOTPService(mobile, otp, "Seller");
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  // Find seller
  const seller = await Seller.findOne({ mobile }).select("-password");
  if (!seller) {
    return res.status(404).json({
      success: false,
      message: "Seller not found",
    });
  }

  // Generate JWT token
  const token = generateToken(seller._id.toString(), "Seller");

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: {
        id: seller._id,
        sellerName: seller.sellerName,
        mobile: seller.mobile,
        email: seller.email,
        storeName: seller.storeName,
        status: seller.status,
        logo: seller.logo,
        location: seller.location,
      },
    },
  });
});

/**
 * Register new seller
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    sellerName,
    mobile,
    email,
    storeName,
    category,
    address,
    city,
    serviceableArea,
  } = req.body;

  // Validation (password removed - sellers don't need password during signup)
  if (!sellerName || !mobile || !email || !storeName || !category) {
    return res.status(400).json({
      success: false,
      message:
        "Required fields (Name, Mobile, Email, Store Name, Category) must be provided",
    });
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Validate location is provided
  const latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
  const longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;

  // Parse and validate service radius
  let serviceRadiusKm = 10; // Default 10km
  if (
    req.body.serviceRadiusKm !== undefined &&
    req.body.serviceRadiusKm !== null &&
    req.body.serviceRadiusKm !== ""
  ) {
    const parsedRadius =
      typeof req.body.serviceRadiusKm === "string"
        ? parseFloat(req.body.serviceRadiusKm)
        : Number(req.body.serviceRadiusKm);

    if (!isNaN(parsedRadius) && parsedRadius >= 0.1 && parsedRadius <= 100) {
      serviceRadiusKm = parsedRadius;
    } else {
      return res.status(400).json({
        success: false,
        message: "Service radius must be between 0.1 and 100 kilometers",
      });
    }
  }

  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    // Location is optional now to allow dynamic setting later
    // Just proceed without setting location if not provided
  }

  // Validate latitude and longitude ranges if provided
  if (
    latitude &&
    longitude &&
    (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid location coordinates",
    });
  }

  // Check if seller already exists
  const existingSeller = await Seller.findOne({
    $or: [{ mobile }, { email }],
  });

  if (existingSeller) {
    return res.status(409).json({
      success: false,
      message: "Seller already exists with this mobile or email",
    });
  }

  // Create Optimized Location object
  const locationObj = {
    address: address || req.body.searchLocation,
    city: city,
    searchLocation: req.body.searchLocation || address,
    latitude: latitude || 0,
    longitude: longitude || 0,
    type: "Point" as const,
    coordinates: [longitude || 0, latitude || 0] as [number, number],
    updatedAt: new Date()
  };

  // Create new seller with Optimized location (password not required during signup)
  const seller = await Seller.create({
    sellerName,
    mobile,
    email,
    storeName,
    category,
    ...(serviceableArea && { serviceableArea }),
    location: locationObj, // Optimized location
    serviceRadiusKm,
    status: "Pending",
    requireProductApproval: false,
    viewCustomerDetails: false,
    commission: 0,
    balance: 0,
    categories: req.body.categories || [],
  });

  // Notify Admin of new registration
  const { sendAdminNewRegistrationNotification } = await import("../../../services/notificationService");
  try {
    await sendAdminNewRegistrationNotification(storeName);
  } catch (notifyError) {
    console.error("Error sending admin registration notification:", notifyError);
  }

  // Generate token
  const token = generateToken(seller._id.toString(), "Seller");

  return res.status(201).json({
    success: true,
    message: "Seller registered successfully. Awaiting admin approval.",
    data: {
      token,
      user: {
        id: seller._id,
        sellerName: seller.sellerName,
        mobile: seller.mobile,
        email: seller.email,
        storeName: seller.storeName,
        status: seller.status,
        location: seller.location,
      },
    },
  });
});

/**
 * Get seller's profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;

  const seller = await Seller.findById(sellerId).select("-password");
  if (!seller) {
    return res.status(404).json({
      success: false,
      message: "Seller not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: seller,
  });
});

/**
 * Update seller's profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const updates = req.body;

    // Prevent updating sensitive fields directly
    const restrictedFields = [
      "password",
      "mobile",
      "email",
      "status",
      "balance",
    ];
    restrictedFields.forEach((field) => delete updates[field]);

    // Build the atomic update object
    const finalUpdate: any = {
      $set: {},
      $unset: {}
    };

    // Filter out restricted fields and separate normal updates from location updates
    const normalUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if (!restrictedFields.includes(key) && key !== 'location' && key !== 'address' && key !== 'city' && key !== 'state' && key !== 'pincode' && key !== 'latitude' && key !== 'longitude' && key !== 'searchLocation') {
        normalUpdates[key] = updates[key];
      }
    });

    if (Object.keys(normalUpdates).length > 0) {
      finalUpdate.$set = { ...normalUpdates };
    }

    // Handle Location Update (handle both flat and nested input)
    const hasLocationInput = updates.location || updates.address || updates.city || updates.state || updates.pincode || updates.latitude || updates.longitude || updates.searchLocation;

    if (hasLocationInput) {
      const currentSeller = await Seller.findById(sellerId);
      const locInput = updates.location || {};

      const lat = updates.latitude || locInput.latitude || currentSeller?.location?.latitude || 0;
      const lng = updates.longitude || locInput.longitude || currentSeller?.location?.longitude || 0;

      finalUpdate.$set.location = {
        address: updates.address || locInput.address || currentSeller?.location?.address || updates.searchLocation || locInput.searchLocation,
        city: updates.city || locInput.city || currentSeller?.location?.city,
        state: updates.state || locInput.state || currentSeller?.location?.state,
        pincode: updates.pincode || locInput.pincode || currentSeller?.location?.pincode,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        searchLocation: updates.searchLocation || locInput.searchLocation || updates.address || locInput.address || currentSeller?.location?.searchLocation,
        type: "Point" as const,
        coordinates: [parseFloat(lng), parseFloat(lat)],
        updatedAt: new Date()
      };

      // Always unset legacy top-level fields
      finalUpdate.$unset = {
        address: 1,
        city: 1,
        state: 1,
        pincode: 1,
        latitude: 1,
        longitude: 1,
        searchLocation: 1
      };
    }

    // Handle serviceRadiusKm update
    if (updates.serviceRadiusKm !== undefined) {
      const radius = parseFloat(updates.serviceRadiusKm);
      if (!isNaN(radius) && radius >= 0.1 && radius <= 100) {
        finalUpdate.$set.serviceRadiusKm = radius;
      } else if (updates.serviceRadiusKm !== "" && updates.serviceRadiusKm !== null) {
        return res.status(400).json({
          success: false,
          message: "Service radius must be between 0.1 and 100 kilometers",
        });
      }
    }

    // Remove empty operators to avoid Mongoose errors
    if (Object.keys(finalUpdate.$set).length === 0) delete finalUpdate.$set;
    if (Object.keys(finalUpdate.$unset).length === 0) delete finalUpdate.$unset;

    const seller = await Seller.findByIdAndUpdate(sellerId, finalUpdate, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: seller,
    });
  },
);

/**
 * Toggle shop status (Open/Close)
 */
export const toggleShopStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // Handle undefined case - if isShopOpen is undefined, default to true (open) then toggle to false
    // This ensures backward compatibility with sellers created before this field was added
    if (seller.isShopOpen === undefined) {
      seller.isShopOpen = false; // Toggle from default "open" to "closed"
    } else {
      seller.isShopOpen = !seller.isShopOpen; // Normal toggle
    }

    // Fix invalid GeoJSON location objects
    // MongoDB requires that if location.type is "Point", coordinates must be a valid array
    if (seller.location && seller.location.type === "Point") {
      if (
        !seller.location.coordinates ||
        !Array.isArray(seller.location.coordinates) ||
        seller.location.coordinates.length !== 2
      ) {
        // Invalid location object - remove it to prevent validation error
        seller.location = undefined;
      }
    }

    await seller.save();

    return res.status(200).json({
      success: true,
      message: `Shop is now ${seller.isShopOpen ? "Open" : "Closed"}`,
      data: { isShopOpen: seller.isShopOpen },
    });
  },
);
