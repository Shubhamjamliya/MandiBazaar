import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate configuration
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.warn("⚠️  Cloudinary credentials not found in environment variables");
}

export default cloudinary;

// Folder structure constants
export const CLOUDINARY_FOLDERS = {
  PRODUCTS: "mandibazaar/products",
  PRODUCT_GALLERY: "mandibazaar/products/gallery",
  CATEGORIES: "mandibazaar/categories",
  SUBCATEGORIES: "mandibazaar/subcategories",
  COUPONS: "mandibazaar/coupons",
  SELLERS: "mandibazaar/sellers",
  SELLER_PROFILE: "mandibazaar/sellers/profile",
  SELLER_DOCUMENTS: "mandibazaar/sellers/documents",
  DELIVERY: "mandibazaar/delivery",
  DELIVERY_DOCUMENTS: "mandibazaar/delivery/documents",
  STORES: "mandibazaar/stores",
  USERS: "mandibazaar/users",
} as const;
