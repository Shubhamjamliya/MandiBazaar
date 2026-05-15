import { Request, Response } from "express";
import Seller from "../../../models/Seller";
import Shop from "../../../models/Shop";
import Product from "../../../models/Product";
import Inventory from "../../../models/Inventory";
import Commission from "../../../models/Commission";
import WithdrawRequest from "../../../models/WithdrawRequest";
import WalletTransaction from "../../../models/WalletTransaction";
import Review from "../../../models/Review";
import {
  sendOTP as sendOTPService,
  verifyOTP as verifyOTPService,
} from "../../../services/otpService";
import { generateToken } from "../../../services/jwtService";
import { asyncHandler } from "../../../utils/asyncHandler";

const WORKING_HOUR_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const isValidTimeString = (value: unknown) => {
  if (typeof value !== "string") return false;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

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
    panCard,
    taxName,
    taxNumber,
    accountName,
    bankName,
    branch,
    accountNumber,
    ifsc,
    category,
    address,
    city,
    serviceableArea,
  } = req.body;

  // Validation (password removed - sellers don't need password during signup)
  if (
    !sellerName || !mobile || !email || !storeName || !category ||
    !panCard || !taxName || !taxNumber || !accountName || !bankName || !branch || !accountNumber || !ifsc
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Required fields (seller details, KYC details, and bank details) must be provided",
    });
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  const normalizedPan = String(panCard).trim().toUpperCase();
  const normalizedTaxName = String(taxName).trim();
  const normalizedTaxNumber = String(taxNumber).trim().toUpperCase();
  const normalizedAccountName = String(accountName).trim();
  const normalizedBankName = String(bankName).trim();
  const normalizedBranch = String(branch).trim();
  const normalizedAccountNumber = String(accountNumber).trim();
  const normalizedIfsc = String(ifsc).trim().toUpperCase();

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) {
    return res.status(400).json({ success: false, message: "Invalid PAN format" });
  }
  if (!/^[A-Za-z][A-Za-z\s.'-]{1,49}$/.test(normalizedTaxName)) {
    return res.status(400).json({ success: false, message: "Invalid tax name format" });
  }
  if (!/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{6,20}$/.test(normalizedTaxNumber)) {
    return res.status(400).json({ success: false, message: "Invalid tax number format" });
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
    return res.status(400).json({ success: false, message: "Invalid IFSC format" });
  }
  if (!/^[0-9]{8,20}$/.test(normalizedAccountNumber)) {
    return res.status(400).json({ success: false, message: "Invalid account number" });
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
    panCard: normalizedPan,
    taxName: normalizedTaxName,
    taxNumber: normalizedTaxNumber,
    accountName: normalizedAccountName,
    bankName: normalizedBankName,
    branch: normalizedBranch,
    accountNumber: normalizedAccountNumber,
    ifsc: normalizedIfsc,
    ...(serviceableArea && { serviceableArea }),
    location: locationObj, // Optimized location
    serviceRadiusKm,
    status: "Pending",
    requireProductApproval: true,
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
      if (!restrictedFields.includes(key) && key !== 'location' && key !== 'address' && key !== 'city' && key !== 'state' && key !== 'pincode' && key !== 'latitude' && key !== 'longitude' && key !== 'searchLocation' && key !== 'workingHours') {
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

    if (updates.workingHours) {
      const { open, close, offDays } = updates.workingHours;
      const normalizedOffDays = Array.isArray(offDays) ? offDays : [];
      const invalidDay = normalizedOffDays.find((day: string) => !WORKING_HOUR_DAYS.includes(day));

      if (!isValidTimeString(open) || !isValidTimeString(close)) {
        return res.status(400).json({
          success: false,
          message: "Opening and closing time must be in HH:mm format",
        });
      }

      if (invalidDay) {
        return res.status(400).json({
          success: false,
          message: `Invalid off day: ${invalidDay}`,
        });
      }

      finalUpdate.$set.workingHours = {
        open,
        close,
        offDays: normalizedOffDays,
      };
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
/**
 * Request account deletion OTP for seller
 */
export const requestDeleteAccountOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { mobile } = req.body;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10-digit mobile number is required",
      });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.mobile !== mobile) {
      return res.status(400).json({
        success: false,
        message: "The mobile number does not match your account",
      });
    }

    // Send OTP
    await sendOTPService(mobile, "Seller");

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your registered mobile number",
    });
  }
);

/**
 * Confirm account deletion for seller
 */
export const confirmDeleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { mobile, otp } = req.body;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!otp || !/^[0-9]{4}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Valid 4-digit OTP is required",
      });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
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

    // --- DELETE ALL SELLER DATA ---

    // 1. Delete Shop
    await Shop.deleteMany({ userId: sellerId });

    // 2. Delete Products and their associated reviews/inventory
    const products = await Product.find({ sellerId });
    const productIds = products.map(p => p._id);
    
    await Inventory.deleteMany({ productId: { $in: productIds } });
    await Review.deleteMany({ productId: { $in: productIds } });
    await Product.deleteMany({ sellerId });

    // 3. Delete Seller financial records
    await Commission.deleteMany({ sellerId });
    await WithdrawRequest.deleteMany({ sellerId });
    await WalletTransaction.deleteMany({ sellerId });

    // 4. Finally, delete the Seller record
    await Seller.deleteOne({ _id: sellerId });

    return res.status(200).json({
      success: true,
      message: "Your seller account and all associated data have been permanently deleted.",
    });
  }
);
