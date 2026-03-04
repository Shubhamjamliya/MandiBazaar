import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";

/**
 * Update Delivery Profile
 * Updates personal and vehicle information
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const {
        name,
        email,
        address,
        city,
        vehicleNumber,
        vehicleType,
        bankName,
        accountNumber,
        ifscCode,
        accountName
    } = req.body;

    // Build update object
    const updateData: any = {
        name: name || undefined,
        email: email || undefined,
        vehicleNumber: vehicleNumber || undefined,
        vehicleType: vehicleType || undefined,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        ifscCode: ifscCode || undefined,
        accountName: accountName || undefined,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    // Handle nested location update
    if (address || city) {
        const currentDelivery = await Delivery.findById(deliveryId);
        updateData.location = {
            ...currentDelivery?.location,
            address: address || currentDelivery?.location?.address,
            city: city || currentDelivery?.location?.city,
            updatedAt: new Date()
        };

        // Unset legacy fields
        updateData.$unset = {
            address: 1,
            city: 1,
            pincode: 1
        };
    }

    const updatedDelivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        updateData,
        { new: true, runValidators: true }
    ).select("-password");

    if (!updatedDelivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedDelivery
    });
});

/**
 * Update Availability Status
 * Toggles isOnline status
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: "isOnline status must be a boolean"
        });
    }

    const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { isOnline },
        { new: true }
    );

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    return res.status(200).json({
        success: true,
        message: `Status updated to ${isOnline ? 'Online' : 'Offline'}`,
        data: {
            isOnline: delivery.isOnline
        }
    });
});

/**
 * Update Delivery Settings
 * Updates notification, location, sound preferences
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { notifications, location, sound } = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Initialize settings if not present
    if (!delivery.settings) {
        delivery.settings = {
            notifications: true,
            location: true,
            sound: true
        };
    }

    if (typeof notifications === 'boolean') delivery.settings.notifications = notifications;
    if (typeof location === 'boolean') delivery.settings.location = location;
    if (typeof sound === 'boolean') delivery.settings.sound = sound;

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: delivery.settings
    });
});
