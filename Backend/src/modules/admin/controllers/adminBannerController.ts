import { Request, Response } from "express";
import Banner from "../../../models/Banner";
import mongoose from "mongoose";

// Get all banners
export const getAllBanners = async (_req: Request, res: Response) => {
  try {
    const banners = await Banner.find().sort({ order: 1 }).lean();

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching banners",
      error: error.message,
    });
  }
};

// Get single banner by ID
export const getBannerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await Banner.findById(id).lean();

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching banner",
      error: error.message,
    });
  }
};

// Create new banner
export const createBanner = async (req: Request, res: Response) => {
  try {
    const { image, link, title, text, type, order, isActive } = req.body;

    // For marquee type, text is required instead of image
    if (type === 'marquee') {
      if (!text) {
        return res.status(400).json({
          success: false,
          message: "Text is required for marquee banners",
        });
      }
    } else if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    // If no order specified, set it to the end
    let bannerOrder = order;
    if (bannerOrder === undefined || bannerOrder === null) {
      const maxOrderBanner = await Banner.findOne().sort({ order: -1 }).lean();
      bannerOrder = maxOrderBanner ? maxOrderBanner.order + 1 : 0;
    }

    const newBanner = new Banner({
      image: image || "",
      link: link || "",
      title: title || "",
      text: text || "",
      type: type || 'carousel',
      order: bannerOrder,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newBanner.save();

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: newBanner,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error creating banner",
      error: error.message,
    });
  }
};

// Update banner
export const updateBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { image, link, title, type, order, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    if (image !== undefined) banner.image = image;
    if (link !== undefined) banner.link = link;
    if (title !== undefined) banner.title = title;
    if ((req.body as any).text !== undefined) (banner as any).text = (req.body as any).text;
    if (type !== undefined) banner.type = type;
    if (order !== undefined) banner.order = order;
    if (isActive !== undefined) banner.isActive = isActive;

    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error updating banner",
      error: error.message,
    });
  }
};

// Delete banner
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error deleting banner",
      error: error.message,
    });
  }
};

// Reorder banners
export const reorderBanners = async (req: Request, res: Response) => {
  try {
    const { banners } = req.body; // Array of { id, order }

    if (!Array.isArray(banners)) {
      return res.status(400).json({
        success: false,
        message: "Banners must be an array",
      });
    }

    const updatePromises = banners.map(({ id, order }: { id: string; order: number }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid banner ID: ${id}`);
      }
      return Banner.findByIdAndUpdate(id, { order }, { new: true });
    });

    await Promise.all(updatePromises);

    const updatedBanners = await Banner.find().sort({ order: 1 }).lean();

    return res.status(200).json({
      success: true,
      message: "Banners reordered successfully",
      data: updatedBanners,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error reordering banners",
      error: error.message,
    });
  }
};
