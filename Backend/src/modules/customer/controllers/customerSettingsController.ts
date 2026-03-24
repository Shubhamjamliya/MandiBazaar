import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import AppSettings from "../../../models/AppSettings";

/**
 * Get public app settings for customer app
 * (Excludes sensitive info like API keys)
 */
export const getPublicSettings = asyncHandler(
  async (_req: Request, res: Response) => {
    const settings = await AppSettings.findOne().select(
      "appName contactEmail contactPhone supportEmail supportPhone privacyPolicy termsOfService customerAppPolicy deliveryAppPolicy returnPolicy refundPolicy faq updatedAt"
    );

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Public settings fetched successfully",
      data: settings,
    });
  }
);
