import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  image?: string;
  order: number;
  isBestseller: boolean;
  hasWarning: boolean;
  groupCategory?: string;
  totalSubcategories?: number;
  commissionRate?: number;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategoryModel extends Model<ICategory> { }

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, "Order cannot be negative"],
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    hasWarning: {
      type: Boolean,
      default: false,
    },
    groupCategory: {
      type: String,
      trim: true,
    },
    totalSubcategories: {
      type: Number,
      default: 0,
      min: [0, "Total subcategories cannot be negative"],
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: [0, "Commission rate cannot be negative"],
      max: [100, "Commission rate cannot exceed 100%"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
CategorySchema.index({ order: 1 });
CategorySchema.index({ name: 1 });
CategorySchema.index({ slug: 1 });
CategorySchema.index({ status: 1 });
// Compound indexes for common queries
CategorySchema.index({ status: 1, order: 1 }); // For getCategories

// Ensure virtuals are included in JSON output
CategorySchema.set("toJSON", { virtuals: true });
CategorySchema.set("toObject", { virtuals: true });

// Pre-save middleware to auto-generate slug if not provided
CategorySchema.pre("save", async function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

const Category = mongoose.model<ICategory, ICategoryModel>(
  "Category",
  CategorySchema
);

export default Category;
