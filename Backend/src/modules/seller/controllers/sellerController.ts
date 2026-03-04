import { Request, Response } from "express";
import Seller from "../../../models/Seller";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Get all sellers (Admin only)
 */
export const getAllSellers = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, search } = req.query;

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { sellerName: { $regex: search, $options: "i" } },
        { storeName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const sellers = await Seller.find(query)
      .select("-password") // Exclude password
      .sort({ createdAt: -1 }); // Sort by newest first

    return res.status(200).json({
      success: true,
      message: "Sellers fetched successfully",
      data: sellers,
    });
  }
);

/**
 * Get seller by ID
 */
export const getSellerById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const seller = await Seller.findById(id).select("-password");

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller fetched successfully",
      data: seller,
    });
  }
);

/**
 * Update seller status (Approve/Reject)
 */
export const updateSellerStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Approved", "Pending", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (Approved, Pending, or Rejected)",
      });
    }

    const seller = await Seller.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select("-password");

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Seller status updated to ${status}`,
      data: seller,
    });
  }
);

/**
 * Update seller details
 */
export const updateSeller = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update data if present
    delete updateData.password;

    // Build the atomic update object
    const finalUpdate: any = {
      $set: {},
      $unset: {}
    };

    // Filter normal updates from location updates
    const normalUpdates: any = {};
    Object.keys(updateData).forEach(key => {
      if (key !== 'location' && key !== 'address' && key !== 'city' && key !== 'state' && key !== 'pincode' && key !== 'latitude' && key !== 'longitude' && key !== 'searchLocation') {
        normalUpdates[key] = updateData[key];
      }
    });

    if (Object.keys(normalUpdates).length > 0) {
      finalUpdate.$set = { ...normalUpdates };
    }

    // Handle Location Update (handle both flat and nested input)
    const hasLocationInput = updateData.location || updateData.address || updateData.city || updateData.state || updateData.pincode || updateData.latitude || updateData.longitude || updateData.searchLocation;

    if (hasLocationInput) {
      const currentSeller = await Seller.findById(id);
      const locInput = updateData.location || {};

      const lat = updateData.latitude || locInput.latitude || currentSeller?.location?.latitude || 0;
      const lng = updateData.longitude || locInput.longitude || currentSeller?.location?.longitude || 0;

      finalUpdate.$set.location = {
        address: updateData.address || locInput.address || currentSeller?.location?.address || updateData.searchLocation || locInput.searchLocation,
        city: updateData.city || locInput.city || currentSeller?.location?.city,
        state: updateData.state || locInput.state || currentSeller?.location?.state,
        pincode: updateData.pincode || locInput.pincode || currentSeller?.location?.pincode,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        searchLocation: updateData.searchLocation || locInput.searchLocation || updateData.address || locInput.address || currentSeller?.location?.searchLocation,
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
    if (updateData.serviceRadiusKm !== undefined) {
      const radius = parseFloat(updateData.serviceRadiusKm);
      if (!isNaN(radius) && radius >= 0.1 && radius <= 100) {
        finalUpdate.$set.serviceRadiusKm = radius;
      } else if (updateData.serviceRadiusKm !== "" && updateData.serviceRadiusKm !== null) {
        return res.status(400).json({
          success: false,
          message: "Service radius must be between 0.1 and 100 kilometers",
        });
      }
    }

    // Remove empty operators to avoid Mongoose errors
    if (Object.keys(finalUpdate.$set).length === 0) delete finalUpdate.$set;
    if (Object.keys(finalUpdate.$unset).length === 0) delete finalUpdate.$unset;

    const seller = await Seller.findByIdAndUpdate(id, finalUpdate, {
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
      message: "Seller updated successfully",
      data: seller,
    });
  }
);

/**
 * Delete seller
 */
export const deleteSeller = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const seller = await Seller.findByIdAndDelete(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller deleted successfully",
    });
  }
);


