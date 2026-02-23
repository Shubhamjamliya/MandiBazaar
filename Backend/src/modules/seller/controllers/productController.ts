import { Request, Response } from "express";
import Product from "../../../models/Product";
import Shop from "../../../models/Shop";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Create a new product
 */
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const productData = req.body;

    // Ensure sellerId matches authenticated seller
    if (productData.sellerId && productData.sellerId !== sellerId) {
      return res.status(403).json({
        success: false,
        message: "You can only create products for your own account",
      });
    }

    // 2. Map fields to match Product model
    const newProductData: any = {
      ...productData,
      seller: sellerId,
      headerCategoryId: productData.headerCategoryId,
      category: productData.categoryId,
      subcategory: productData.subcategoryId,
      brand: productData.brandId,
      mainImage: productData.mainImageUrl,
      galleryImages: productData.galleryImageUrls,
    };

    const isWeightMode = productData.sellingUnit === 'weight';

    if (isWeightMode) {
      // Weight mode: price & stock derived by pre-save hook from weightVariants
      const enabledVariants = (productData.weightVariants || []).filter((v: any) => v.isEnabled);
      if (!enabledVariants.length) {
        return res.status(400).json({ success: false, message: "Enable at least one weight variant" });
      }
      // Set a placeholder price so model validation passes (pre-save hook will override)
      const sorted = [...enabledVariants].sort((a: any, b: any) => a.grams - b.grams);
      newProductData.price = sorted[0].price || 0;
      newProductData.stock = enabledVariants.reduce((s: number, v: any) => s + (Number(v.stock) || 0), 0);
    } else {
      // Quantity mode: map variations
      if (newProductData.variations) {
        newProductData.variations = newProductData.variations.map((v: any) => ({
          ...v,
          value: v.value || v.title,
          name: v.name || "Variation",
          discPrice: v.discPrice || 0,
          status: v.status || "Available",
        }));
      }

      if (newProductData.variations && newProductData.variations.length > 0) {
        newProductData.price = newProductData.variations[0].price;
        newProductData.discPrice = newProductData.variations[0].discPrice || 0;
        newProductData.stock = newProductData.variations.reduce(
          (acc: number, curr: any) => acc + (parseInt(curr.stock) || 0),
          0
        );
      }

      // Validate price
      if (newProductData.price === undefined || newProductData.price === null) {
        return res.status(400).json({
          success: false,
          message: "Product price is required (add at least one variation)",
        });
      }

      // Validate variation discPrices
      for (const variation of (productData.variations || [])) {
        if (Number(variation.discPrice) > Number(variation.price)) {
          return res.status(400).json({
            success: false,
            message: `Discounted price (${variation.discPrice}) cannot be greater than price (${variation.price}) for variation ${variation.title}`,
          });
        }
      }
    }

    // 5. Clean up undefined fields
    if (!newProductData.headerCategoryId) delete newProductData.headerCategoryId;
    if (!newProductData.subcategory) delete newProductData.subcategory;
    if (!newProductData.brand) delete newProductData.brand;

    if (productData.taxId) {
      newProductData.tax = productData.taxId;
    }

    // 6. Set product status
    newProductData.publish = true;
    newProductData.status = "Active";
    newProductData.requiresApproval = false;

    if (!newProductData.popular) newProductData.popular = false;
    if (!newProductData.dealOfDay) newProductData.dealOfDay = false;
    if (!newProductData.isReturnable) newProductData.isReturnable = false;
    if (!newProductData.rating) newProductData.rating = 0;
    if (!newProductData.reviewsCount) newProductData.reviewsCount = 0;
    if (!newProductData.discount) newProductData.discount = 0;
    if (!newProductData.tags) newProductData.tags = [];

    // Handle Shop by Store fields
    if (productData.isShopByStoreOnly !== undefined) {
      newProductData.isShopByStoreOnly = productData.isShopByStoreOnly === true || productData.isShopByStoreOnly === "true";
    }
    if (productData.shopId) {
      newProductData.shopId = productData.shopId;
    } else if (newProductData.isShopByStoreOnly) {
      newProductData.shopId = null;
    }

    const product = await Product.create(newProductData);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  }
);

/**
 * Get seller's products with filters
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;
  const {
    search,
    category,
    status,
    stock,
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Build query
  const query: any = {};

  // Filter by seller IF the user is a Seller. 
  // If the user is an Admin, they can see/manage all products (or filtered by 'seller' query param if provided).
  if ((req as any).user.userType === "Seller") {
    query.seller = sellerId;
  } else if ((req as any).user.userType === "Admin" && req.query.seller) {
    // Admin can filter by seller if they want
    query.seller = req.query.seller;
  }

  // Search filter
  if (search) {
    query.$or = [
      { productName: { $regex: search, $options: "i" } },
      { smallDescription: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search as string, "i")] } },
    ];
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Status filter (publish, popular, dealOfDay)
  if (status) {
    if (status === "published") {
      query.publish = true;
    } else if (status === "unpublished") {
      query.publish = false;
    } else if (status === "popular") {
      query.popular = true;
    } else if (status === "dealOfDay") {
      query.dealOfDay = true;
    }
  }

  // Stock filter
  if (stock === "inStock") {
    query["variations.stock"] = { $gt: 0 };
  } else if (stock === "outOfStock") {
    query["variations.stock"] = 0;
    query["variations.status"] = "Sold out";
  }

  // Pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const products = await Product.find(query)
    .populate("category", "name")
    .populate("subcategory", "name")
    .populate("brand", "name")
    .populate("tax", "name rate")
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const total = await Product.countDocuments(query);

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    data: products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * Get product by ID
 */
export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;

    // Prevent reserved route names from being treated as product IDs
    const reservedRoutes = ["shops", "brands"];
    if (reservedRoutes.includes(id)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const query: any = { _id: id };
    if ((req as any).user.userType === "Seller") {
      query.seller = sellerId;
    }

    const product = await Product.findOne(query)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("brand", "name")
      .populate("tax", "name rate");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  }
);

/**
 * Update product
 */
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;
    const updateData = req.body;

    console.log("DEBUG updateProduct: sellerId from token:", sellerId);
    console.log("DEBUG updateProduct: productId:", id);

    // Remove sellerId from update data if present (cannot change owner)
    delete updateData.sellerId;

    // Map frontend field names to model field names (same as createProduct)
    if (updateData.headerCategoryId !== undefined) {
      updateData.headerCategoryId = updateData.headerCategoryId || null;
    }
    if (updateData.categoryId) {
      updateData.category = updateData.categoryId;
      delete updateData.categoryId;
    }
    if (updateData.subcategoryId) {
      updateData.subcategory = updateData.subcategoryId;
      delete updateData.subcategoryId;
    }
    if (updateData.brandId) {
      updateData.brand = updateData.brandId;
      delete updateData.brandId;
    }
    if (updateData.taxId) {
      updateData.tax = updateData.taxId;
      delete updateData.taxId;
    }
    if (updateData.mainImageUrl) {
      updateData.mainImage = updateData.mainImageUrl;
      delete updateData.mainImageUrl;
    }
    if (updateData.galleryImageUrls) {
      updateData.galleryImages = updateData.galleryImageUrls;
      delete updateData.galleryImageUrls;
    }

    const isWeightMode = updateData.sellingUnit === 'weight';

    if (isWeightMode) {
      // Weight mode: validate weightVariants
      const enabledVariants = (updateData.weightVariants || []).filter((v: any) => v.isEnabled);
      if (!enabledVariants.length) {
        return res.status(400).json({ success: false, message: "Enable at least one weight variant" });
      }
      // price & stock set by pre-save hook
    } else if (updateData.variations) {
      // Quantity mode: validate variations
      if (updateData.variations.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Product must have at least one variation",
        });
      }

      updateData.variations = updateData.variations.map((v: any) => ({
        ...v,
        value: v.value || v.title,
        name: v.name || "Variation",
        discPrice: v.discPrice || 0,
        status: v.status || "Available",
      }));

      for (const variation of updateData.variations) {
        if (Number(variation.discPrice) > Number(variation.price)) {
          return res.status(400).json({
            success: false,
            message: `Discounted price cannot be greater than price for variation ${variation.title || variation.value}`,
          });
        }
      }

      updateData.price = updateData.variations[0].price;
      updateData.discPrice = updateData.variations[0].discPrice || 0;
      updateData.stock = updateData.variations.reduce(
        (acc: number, curr: any) => acc + (parseInt(curr.stock) || 0),
        0
      );
    }

    // Handle Shop by Store fields
    if (updateData.isShopByStoreOnly !== undefined) {
      updateData.isShopByStoreOnly = updateData.isShopByStoreOnly === true || updateData.isShopByStoreOnly === "true";
    }
    if (updateData.shopId !== undefined) {
      updateData.shopId = updateData.shopId || null;
    } else if (updateData.isShopByStoreOnly === false) {
      updateData.shopId = null;
    }

    // Use findOne and then save to trigger pre-save hooks
    const query: any = { _id: id };
    if ((req as any).user.userType === "Seller") {
      query.seller = sellerId;
    }
    const product = await Product.findOne(query);

    if (!product) {
      const existingProduct = await Product.findById(id).select("seller");
      if (existingProduct) {
        console.log("DEBUG updateProduct: product exists but owned by:", existingProduct.seller);
      }
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Apply updates
    Object.assign(product, updateData);

    // Mark modified sub-documents
    if (updateData.variations) product.markModified("variations");
    if (updateData.weightVariants) product.markModified("weightVariants");

    await product.save();

    // Re-populate for response
    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("brand", "name")
      .populate("tax", "name rate");

    console.log("DEBUG updateProduct: product updated successfully");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: populatedProduct,
    });
  }
);

/**
 * Delete product
 */
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;

    console.log("DEBUG deleteProduct: sellerId from token:", sellerId);
    console.log("DEBUG deleteProduct: productId:", id);

    const query: any = { _id: id };
    if ((req as any).user.userType === "Seller") {
      query.seller = sellerId;
    }
    const product = await Product.findOneAndDelete(query);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  }
);

/**
 * Update stock for a product variation
 */
export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user.userId;
  const { id, variationId } = req.params;
  const { stock, status } = req.body;

  const queryCond: any = { _id: id };
  if ((req as any).user.userType === "Seller") {
    queryCond.seller = sellerId;
  }
  const product = await Product.findOne(queryCond);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const variation: any = product.variations?.find(
    (v: any) => v._id?.toString() === variationId
  );
  if (!variation) {
    return res.status(404).json({
      success: false,
      message: "Variation not found",
    });
  }

  if (stock !== undefined) {
    variation.stock = stock;
    // Automatically update status based on stock
    if (stock === 0) {
      variation.status = "Sold out";
    } else if (stock > 0 && variation.status === "Sold out") {
      variation.status = "Available";
    }
  }
  if (status) {
    variation.status = status;
  }

  // Mark variations as modified since we updated a sub-document field
  product.markModified("variations");
  await product.save();

  return res.status(200).json({
    success: true,
    message: "Stock updated successfully",
    data: product,
  });
});

/**
 * Update product status (publish, popular, dealOfDay)
 */
export const updateProductStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params;
    const { publish, popular, dealOfDay } = req.body;

    const updateData: any = {};
    if (publish !== undefined) updateData.publish = publish;
    if (popular !== undefined) updateData.popular = popular;
    if (dealOfDay !== undefined) updateData.dealOfDay = dealOfDay;

    const queryCond: any = { _id: id };
    if ((req as any).user.userType === "Seller") {
      queryCond.seller = sellerId;
    }

    const product = await Product.findOneAndUpdate(
      queryCond,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product status updated successfully",
      data: product,
    });
  }
);

/**
 * Bulk update stock for multiple products/variations
 */
export const bulkUpdateStock = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { updates } = req.body; // Array of { productId, variationId, stock }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: "Updates must be an array",
      });
    }

    const results = [];
    for (const update of updates) {
      const { productId, variationId, stock } = update;

      const queryCond: any = {
        _id: productId,
      };
      if ((req as any).user.userType === "Seller") {
        queryCond.seller = sellerId;
      }

      const product = await Product.findOne(queryCond);
      if (product) {
        const variation: any = product.variations?.find(
          (v: any) => v._id?.toString() === variationId
        );
        if (variation) {
          variation.stock = stock;
          if (stock === 0) variation.status = "Sold out";
          else if (stock > 0 && variation.status === "Sold out")
            variation.status = "In stock";

          await product.save();
          results.push({ productId, variationId, success: true });
        } else {
          results.push({
            productId,
            variationId,
            success: false,
            message: "Variation not found",
          });
        }
      } else {
        results.push({
          productId,
          variationId,
          success: false,
          message: "Product not found",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk stock update processed",
      data: results,
    });
  }
);

/**
 * Get all active shops (for seller to select when creating shop-by-store-only products)
 */
export const getShops = asyncHandler(async (_req: Request, res: Response) => {
  const shops = await Shop.find({ isActive: true })
    .select("_id name storeId image")
    .sort({ order: 1, name: 1 })
    .lean();

  return res.status(200).json({
    success: true,
    message: "Shops fetched successfully",
    data: shops || [],
  });
});
