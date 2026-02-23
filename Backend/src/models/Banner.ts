import mongoose, { Schema, Document } from "mongoose";

export interface IBanner extends Document {
  image: string;
  link: string;
  title: string;
  text?: string; // For marquee banners
  type: 'carousel' | 'banner-1' | 'banner-3' | 'marquee';
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    image: {
      type: String,
      default: "",
      trim: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ['carousel', 'banner-1', 'banner-3', 'marquee'],
      default: 'carousel',
      required: [true, "Banner type is required"],
      trim: true,
    },
    order: {
      type: Number,
      required: [true, "Display order is required"],
      default: 0,
      min: [0, "Order cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BannerSchema.index({ order: 1, isActive: 1 });
BannerSchema.index({ isActive: 1 });

const Banner = mongoose.model<IBanner>("Banner", BannerSchema);

export default Banner;
