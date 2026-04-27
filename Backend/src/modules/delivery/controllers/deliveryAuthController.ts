import { Request, Response } from "express";
import Delivery from "../../../models/Delivery";
import {
  sendSmsOtp as sendSmsOtpService,
  verifySmsOtp as verifySmsOtpService,
} from "../../../services/otpService";
import { generateToken } from "../../../services/jwtService";
import { asyncHandler } from "../../../utils/asyncHandler";
import DeliveryTracking from "../../../models/DeliveryTracking";
import WalletTransaction from "../../../models/WalletTransaction";
import WithdrawRequest from "../../../models/WithdrawRequest";
import Notification from "../../../models/Notification";
// import { uploadDocument } from "../../../services/uploadService"; // File does not exist

/**
 * Send SMS OTP to delivery mobile number
 */
export const sendSmsOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Check if delivery partner exists with this mobile
  const delivery = await Delivery.findOne({ mobile });
  if (!delivery) {
    return res.status(400).json({
      success: false,
      message:
        "Delivery partner not found with this mobile number. Please register first.",
    });
  }

  // Send SMS OTP
  const result = await sendSmsOtpService(mobile, "Delivery");

  return res.status(200).json({
    success: true,
    message: result.message,
    sessionId: result.sessionId,
  });
});

/**
 * Verify SMS OTP and login delivery partner
 */
export const verifySmsOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const { mobile, otp, sessionId } = req.body;

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

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Verify SMS OTP
    const isValid = await verifySmsOtpService(
      sessionId,
      otp,
      mobile,
      "Delivery",
    );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Find delivery partner
    const delivery = await Delivery.findOne({ mobile }).select("-password");

    if (!delivery) {
      return res.status(401).json({
        success: false,
        message: "Delivery partner not found. Please Register first.",
      });
    }

    // Generate JWT token
    const token = generateToken(delivery._id.toString(), "Delivery");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: delivery._id,
          name: delivery.name,
          mobile: delivery.mobile,
          email: delivery.email,
          location: delivery.location,
          status: delivery.status,
        },
      },
    });
  },
);

/**
 * Register new delivery partner
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    mobile,
    email,
    dateOfBirth,
    password,
    address,
    city,
    pincode,
    drivingLicense,
    nationalIdentityCard,
    accountName,
    bankName,
    accountNumber,
    ifscCode,
    bonusType,
  } = req.body;

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedCity = typeof city === "string" ? city.trim() : "";
  const normalizedPincode = typeof pincode === "string" ? pincode.trim() : "";
  const normalizedAccountName = typeof accountName === "string" ? accountName.trim() : "";
  const normalizedBankName = typeof bankName === "string" ? bankName.trim() : "";
  const normalizedAccountNumber = typeof accountNumber === "string" ? accountNumber.trim() : "";
  const normalizedIfscCode = typeof ifscCode === "string" ? ifscCode.trim().toUpperCase() : "";

  // Validation
  if (!normalizedName || !mobile || !normalizedEmail || !dateOfBirth || !address || !normalizedCity || !normalizedPincode) {
    return res.status(400).json({
      success: false,
      message: "Name, mobile, email, date of birth, address, city and pincode are required",
    });
  }

  if (!/^[A-Za-z ]{2,50}$/.test(normalizedName)) {
    return res.status(400).json({
      success: false,
      message: "Name should contain only alphabets",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Email should be in valid format",
    });
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  if (!/^[A-Za-z ]+$/.test(normalizedCity)) {
    return res.status(400).json({
      success: false,
      message: "City should contain only alphabets",
    });
  }

  if (!/^\d{6}$/.test(normalizedPincode)) {
    return res.status(400).json({
      success: false,
      message: "Pin code should be a valid 6-digit number",
    });
  }

  const dob = new Date(dateOfBirth);
  const minAllowedDob = new Date();
  minAllowedDob.setFullYear(minAllowedDob.getFullYear() - 18);
  if (Number.isNaN(dob.getTime()) || dob > minAllowedDob) {
    return res.status(400).json({
      success: false,
      message: "Date of birth should be 18+ age",
    });
  }

  if (!drivingLicense || !nationalIdentityCard) {
    return res.status(400).json({
      success: false,
      message: "Driving License and National Identity Card documents are mandatory",
    });
  }

  if (normalizedAccountName && !/^[A-Za-z ]+$/.test(normalizedAccountName)) {
    return res.status(400).json({
      success: false,
      message: "Account name should contain only alphabets",
    });
  }

  if (normalizedBankName && !/^[A-Za-z ]+$/.test(normalizedBankName)) {
    return res.status(400).json({
      success: false,
      message: "Bank name should contain only alphabets",
    });
  }

  if (normalizedAccountNumber && !/^\d{9,15}$/.test(normalizedAccountNumber)) {
    return res.status(400).json({
      success: false,
      message: "Account number should be 9 to 15 digits",
    });
  }

  if (normalizedIfscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfscCode)) {
    return res.status(400).json({
      success: false,
      message: "IFSC Code should be in format like HDFC0001015",
    });
  }

  // Check if delivery partner already exists
  const existingDelivery = await Delivery.findOne({
    $or: [{ mobile }, { email: normalizedEmail }],
  });

  if (existingDelivery) {
    return res.status(409).json({
      success: false,
      message: "Delivery partner already exists with this mobile or email",
    });
  }

  const generatedPassword = password && String(password).trim().length >= 6
    ? String(password).trim()
    : `DP@${mobile}${Math.floor(100 + Math.random() * 900)}`;

  // Create new delivery partner
  await Delivery.create({
    name: normalizedName,
    mobile,
    email: normalizedEmail,
    dateOfBirth: dob,
    password: generatedPassword,
    location: {
      address,
      city: normalizedCity,
      pincode: normalizedPincode,
      type: 'Point',
      coordinates: [0, 0], // Will be updated when they go online/update location
      updatedAt: new Date()
    },
    drivingLicense,
    nationalIdentityCard,
    accountName: normalizedAccountName || undefined,
    bankName: normalizedBankName || undefined,
    accountNumber: normalizedAccountNumber || undefined,
    ifscCode: normalizedIfscCode || undefined,
    bonusType,
    status: "Inactive", // New delivery partners start as Inactive
    balance: 0,
    cashCollected: 0,
  } as any);

  // Notify Admin of new registration
  const { sendAdminNewRegistrationNotification } = await import("../../../services/notificationService");
  try {
    await sendAdminNewRegistrationNotification(`Delivery Partner: ${name}`);
  } catch (notifyError) {
    console.error("Error sending admin registration notification for delivery partner:", notifyError);
  }

  // Generate token (Optional: usually registration doesn't login immediately if approval needed, but for seamless UX we can)
  // However, FE Flow: Register -> OTP -> Login. So we return success, then FE calls sendSmsOtp.

  return res.status(201).json({
    success: true,
    message: "Delivery partner registered successfully.",
    // No token returned here, flow continues to OTP
  });
});

/**
 * Get current delivery partner profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore - req.user is added by middleware
  const userId = (req.user as any).userId;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
  }

  const delivery = await Delivery.findById(userId).select("-password");

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: "Delivery partner not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: delivery,
  });
});

/**
 * Request OTP for delivery account deletion
 */
export const requestDeleteAccountOTP = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.userId;

  const delivery = await Delivery.findById(userId);
  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: "Delivery partner not found",
    });
  }

  // Send OTP to delivery partner's mobile
  const result = await sendSmsOtpService(delivery.mobile, "Delivery");

  return res.status(200).json({
    success: true,
    message: "OTP sent to your registered mobile number",
    sessionId: result.sessionId,
  });
});

/**
 * Confirm delivery account deletion and cleanup data
 */
export const confirmDeleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { otp, sessionId } = req.body;
  // @ts-ignore
  const userId = req.user.userId;

  if (!otp || !sessionId) {
    return res.status(400).json({
      success: false,
      message: "OTP and Session ID are required",
    });
  }

  const delivery = await Delivery.findById(userId);
  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: "Delivery partner not found",
    });
  }

  // Verify OTP
  const isValid = await verifySmsOtpService(
    sessionId,
    otp,
    delivery.mobile,
    "Delivery"
  );

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  // Start Cascading Deletion
  const deliveryId = delivery._id;

  // 1. Delete Delivery Tracking
  await DeliveryTracking.deleteMany({ deliveryBoy: deliveryId });

  // 2. Delete Wallet Transactions
  await WalletTransaction.deleteMany({ userId: deliveryId, userType: "DELIVERY_BOY" });

  // 3. Delete Withdraw Requests
  await WithdrawRequest.deleteMany({ userId: deliveryId, userType: "DELIVERY_BOY" });

  // 4. Delete Notifications
  await Notification.deleteMany({ recipient: deliveryId, recipientType: "Delivery" });

  // 5. Finally delete the Delivery record
  await Delivery.findByIdAndDelete(deliveryId);

  return res.status(200).json({
    success: true,
    message: "Your delivery account and all associated data have been permanently deleted.",
  });
});
