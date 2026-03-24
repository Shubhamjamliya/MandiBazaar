import { Router } from "express";
import { getHomeContent, getStoreProducts } from "../modules/customer/controllers/customerHomeController";
import { getPublicSettings } from "../modules/customer/controllers/customerSettingsController";

const router = Router();

// Public routes
router.get("/", getHomeContent);
router.get("/store/:storeId", getStoreProducts);
router.get("/settings", getPublicSettings);

export default router;
