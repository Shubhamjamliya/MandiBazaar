import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";
import DeliveryAssignment from "../../../models/DeliveryAssignment";
import CashCollection from "../../../models/CashCollection";
import { logCashSettlement } from "../../../services/walletManagementService";
import {
  runInTransaction,
  settleDeliveryBoyCash,
  getPendingHandoverAmount,
  SettlementError,
} from "../../../services/codSettlementService";

/**
 * Create a new delivery boy
 */
export const createDeliveryBoy = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      mobile,
      email,
      password,
      dateOfBirth,
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

    if (!name || !mobile || !email || !password || !address || !city) {
      return res.status(400).json({
        success: false,
        message:
          "Name, mobile, email, password, address, and city are required",
      });
    }

    const deliveryBoy = await Delivery.create({
      name,
      mobile,
      email,
      password,
      dateOfBirth,
      location: {
        address,
        city,
        state: req.body.state,
        pincode,
        type: 'Point',
        coordinates: [req.body.longitude || 0, req.body.latitude || 0],
        updatedAt: new Date(),
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      },
      drivingLicense,
      nationalIdentityCard,
      accountName,
      bankName,
      accountNumber,
      ifscCode,
      bonusType,
      status: "Inactive", // New delivery boys start as inactive
    });

    return res.status(201).json({
      success: true,
      message: "Delivery boy created successfully",
      data: deliveryBoy,
    });
  }
);

/**
 * Get all delivery boys
 */
export const getAllDeliveryBoys = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      status,
      available,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (available) query.available = available;
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { mobile: { $regex: search as string, $options: "i" } },
        { email: { $regex: search as string, $options: "i" } },
        { address: { $regex: search as string, $options: "i" } },
      ];
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [deliveryBoys, total] = await Promise.all([
      Delivery.find(query)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Delivery.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Delivery boys fetched successfully",
      data: deliveryBoys,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Get delivery boy by ID
 */
export const getDeliveryBoyById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const deliveryBoy = await Delivery.findById(id).select("-password");

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery boy fetched successfully",
      data: deliveryBoy,
    });
  }
);

/**
 * Update delivery boy
 */
export const updateDeliveryBoy = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow password update through this endpoint
    delete updateData.password;

    // Handle nested location update
    if (updateData.address || updateData.city || updateData.latitude || updateData.longitude) {
      const currentDelivery = await Delivery.findById(id);
      const lat = updateData.latitude ? parseFloat(updateData.latitude) : (currentDelivery?.location?.latitude || 0);
      const lng = updateData.longitude ? parseFloat(updateData.longitude) : (currentDelivery?.location?.longitude || 0);

      updateData.location = {
        ...currentDelivery?.location?.toObject(),
        address: updateData.address || currentDelivery?.location?.address,
        city: updateData.city || currentDelivery?.location?.city,
        state: updateData.state || currentDelivery?.location?.state,
        pincode: updateData.pincode || currentDelivery?.location?.pincode,
        latitude: lat,
        longitude: lng,
        type: 'Point',
        coordinates: [lng, lat],
        updatedAt: new Date()
      };

      // Unset legacy fields
      updateData.$unset = {
        address: 1,
        city: 1,
        pincode: 1,
        latitude: 1,
        longitude: 1
      };

      // Clean up updateData to avoid redundancy
      delete updateData.address;
      delete updateData.city;
      delete updateData.pincode;
      delete updateData.latitude;
      delete updateData.longitude;
      delete updateData.state;
    }

    const deliveryBoy = await Delivery.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery boy updated successfully",
      data: deliveryBoy,
    });
  }
);

/**
 * Delete delivery boy
 */
export const deleteDeliveryBoy = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check for active assignments
    const activeAssignments = await DeliveryAssignment.countDocuments({
      deliveryBoy: id,
      status: { $in: ["Assigned", "Picked Up", "In Transit"] },
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete delivery boy with active assignments",
      });
    }

    // Check if cash balance exists
    const deliveryBoy = await Delivery.findById(id);
    if (deliveryBoy && (deliveryBoy.balance > 0 || deliveryBoy.cashCollected > 0)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete delivery boy with pending balance or cash collected",
      });
    }

    const deletedDeliveryBoy = await Delivery.findByIdAndDelete(id);

    if (!deletedDeliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery boy deleted successfully",
    });
  }
);

/**
 * Update delivery boy status
 */
export const updateDeliveryStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive",
      });
    }

    const existingDeliveryBoy = await Delivery.findById(id).select("status name");

    if (!existingDeliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    const previousStatus = existingDeliveryBoy.status;

    const deliveryBoy = await Delivery.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select("-password");

    if (deliveryBoy && previousStatus !== "Active" && status === "Active") {
      try {
        const { sendNotification } = await import("../../../services/notificationService");
        await sendNotification(
          "Delivery",
          deliveryBoy._id.toString(),
          "Account Approved",
          "Congratulations! Your delivery partner account has been approved by admin.",
          {
            type: "Success",
            link: "/delivery",
            priority: "High",
            data: { status: "Active" },
          }
        );
      } catch (notifyError) {
        console.error("Error sending delivery approval notification:", notifyError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Delivery boy status updated successfully",
      data: deliveryBoy,
    });
  }
);

/**
 * Update delivery boy availability
 */
export const updateDeliveryBoyAvailability = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { available } = req.body; // Expecting "Available" or "Not Available"

    if (!["Available", "Not Available"].includes(available)) {
      return res.status(400).json({
        success: false,
        message: "Availability must be 'Available' or 'Not Available'",
      });
    }

    const deliveryBoy = await Delivery.findByIdAndUpdate(
      id,
      { available },
      { new: true, runValidators: true }
    ).select("-password");

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery boy availability updated successfully",
      data: deliveryBoy,
    });
  }
);

/**
 * Get delivery assignments
 */
export const getDeliveryAssignments = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params; // Delivery boy ID
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { deliveryBoy: id };
    if (status) query.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [assignments, total] = await Promise.all([
      DeliveryAssignment.find(query)
        .populate("order")
        .populate("assignedBy", "firstName lastName")
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      DeliveryAssignment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Delivery assignments fetched successfully",
      data: assignments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Collect cash from delivery boy
 */
export const collectCash = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // Delivery boy ID
  const { amount, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid amount is required",
    });
  }

  const deliveryBoy = await Delivery.findById(id);
  if (!deliveryBoy) {
    return res.status(404).json({
      success: false,
      message: "Delivery boy not found",
    });
  }

  const previousCashCollected = deliveryBoy.cashCollected || 0;
  const pendingAmount = await getPendingHandoverAmount(id);
  if (previousCashCollected - pendingAmount < amount) {
    return res.status(400).json({
      success: false,
      message: "Amount exceeds cash collected (excluding pending handover requests)",
    });
  }

  let updated;
  try {
    updated = await runInTransaction(async (session) => {
      const { deliveryBoy: updatedBoy, settledOrders } = await settleDeliveryBoyCash(id, Number(amount), session);
      const [collection] = await CashCollection.create([{
        deliveryBoy: id,
        amount: Number(amount),
        remark: notes,
        status: "Approved",
        settlementApplied: true,
        settledOrders,
        collectedBy: req.user?.userId,
        reviewedBy: req.user?.userId,
        reviewedAt: new Date(),
        collectedAt: new Date(),
      }], { session });
      await logCashSettlement(id, Number(amount), `Cash settled by Admin. Remark: ${notes || 'N/A'}`, `CC-${collection._id}`, session);
      return updatedBoy;
    });
  } catch (error: any) {
    if (error instanceof SettlementError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    throw error;
  }

  return res.status(200).json({
    success: true,
    message: "Cash collected successfully",
    data: {
      deliveryBoy: updated.toObject(),
      transaction: {
        amount,
        notes,
        previousCashCollected,
        newCashCollected: updated.cashCollected,
      },
    },
  });
});

/**
 * Get delivery boy cash collections
 */
export const getDeliveryBoyCashCollections = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [collections, total] = await Promise.all([
      CashCollection.find({ deliveryBoy: id })
        .sort({ collectedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      CashCollection.countDocuments({ deliveryBoy: id }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Cash collections fetched successfully",
      data: collections,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);
