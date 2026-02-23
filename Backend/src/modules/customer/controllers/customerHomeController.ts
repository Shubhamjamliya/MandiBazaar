import { Request, Response } from "express";
import Product from "../../../models/Product";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Shop from "../../../models/Shop";
// HomeSection import removed - replaced by Category hierarchy
import BestsellerCard from "../../../models/BestsellerCard";
import LowestPricesProduct from "../../../models/LowestPricesProduct";
import mongoose from "mongoose";
import { cache } from "../../../utils/cache";
import { findSellersWithinRange } from "../../../utils/locationHelper";

// Get Home Page Content
export const getHomeContent = async (req: Request, res: Response) => {
  const { latitude, longitude } = req.query; // Get location from query params

  try {
    // Find sellers within user's location range
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    let nearbySellerIds: mongoose.Types.ObjectId[] = [];
    if (userLat !== null && userLng !== null) {
      nearbySellerIds = await findSellersWithinRange(userLat, userLng);
    } else {
      // If no location provided, return empty sellers list to enforce filtering
      nearbySellerIds = [];
    }

    // 1. Featured / Bestsellers - Get bestseller cards from admin configuration
    const bestsellerCards = await BestsellerCard.find({
      isActive: true,
    })
      .populate("category", "name slug image")
      .sort({ order: 1 })
      .limit(6)
      .lean();

    // For each bestseller card, get 4 products from the associated category
    const bestsellers = await Promise.all(
      bestsellerCards
        .filter((card: any) => {
          return !!card.category;
        })
        .map(async (card: any) => {
          const categoryId = card.category?._id || card.category;

          // Build product query for images (ignore location to show category preview)
          const productQuery: any = {
            category: categoryId,
            status: "Active",
            publish: true,
          };

          // Fetch 4 active products from the category for preview images
          // We fetch these irrespective of location radius to show category preview
          const categoryProducts = await Product.find(productQuery)
            .select("productName mainImage galleryImages")
            .sort({ createdAt: -1 })
            .limit(4)
            .lean();

          // Extract exactly 4 product images (prefer mainImage, fallback to galleryImages[0])
          const productImages: string[] = [];
          categoryProducts.forEach((product: any) => {
            if (productImages.length < 4 && product.mainImage) {
              productImages.push(product.mainImage);
            }
          });

          // If we have less than 4 products, try to use gallery images
          if (productImages.length < 4) {
            categoryProducts.forEach((product: any) => {
              if (
                productImages.length < 4 &&
                product.galleryImages &&
                product.galleryImages.length > 0
              ) {
                productImages.push(product.galleryImages[0]);
              }
            });
          }

          // Ensure we have exactly 4 images (pad with first image if needed)
          while (productImages.length < 4 && productImages[0]) {
            productImages.push(productImages[0]);
          }

          return {
            id: card._id.toString(),
            categoryId: categoryId.toString(),
            name: card.name,
            productImages: productImages.slice(0, 4),
            productCount: categoryProducts.length,
          };
        })
    );

    const lowestPricesProductsQuery: any = {
      isActive: true,
    };

    const lowestPricesProducts = await LowestPricesProduct.find(
      lowestPricesProductsQuery
    )
      .populate({
        path: "product",
        select:
          "productName mainImage price mrp discount status publish category subcategory seller",
        populate: { path: "category", select: "name slug" },
        match: {
          status: "Active",
          publish: true,
        },
      })
      .sort({ order: 1 })
      .lean();

    // Filter out any products that were null (due to match condition) OR don't belong to fruits/vegetables
    const validLowestPricesProducts = lowestPricesProducts
      .filter((item: any) => {
        const p = item.product;
        return p && !!p.category;
      })
      .map((item: any) => {
        const product = item.product;
        // Check if the product's seller is within range
        const isAvailable = nearbySellerIds && nearbySellerIds.length > 0 && product.seller
          ? nearbySellerIds.some(id => id.toString() === product.seller.toString())
          : false;

        return {
          id: product._id.toString(),
          _id: product._id.toString(),
          productName: product.productName,
          name: product.productName,
          mainImage: product.mainImage,
          imageUrl: product.mainImage,
          price: product.price,
          mrp: product.mrp || product.price,
          discount: product.discount || (product.mrp && product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0),
          categoryId: product.category?._id?.toString() || product.category?.toString() || "",
          subcategory: product.subcategory?.toString() || "",
          status: product.status,
          publish: product.publish,
          isAvailable,
          seller: product.seller,
        };
      });

    // 3. Categories for Tiles (Grocery, Snacks, etc)
    const categories = await Category.find({
      status: "Active",
    })
      .select("name image icon color slug")
      .sort({ order: 1 })
      .lean();

    // 4. Shop By Store - Fetch from database
    const shopDocuments = await Shop.find({ isActive: true })
      .populate("category", "name slug")
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Transform shop data to match frontend expected format and include preview images
    const shops = await Promise.all(
      shopDocuments.map(async (shop: any) => {
        let productImages: string[] = [];

        if (shop.products && shop.products.length > 0) {
          const shopProducts = await Product.find({
            _id: { $in: shop.products.slice(0, 4) },
            status: "Active",
            publish: true,
          })
            .select("mainImage")
            .lean();

          productImages = shopProducts.map((p: any) => p.mainImage).filter(Boolean);
        }

        return {
          id: shop.storeId || shop._id.toString(),
          name: shop.name,
          image: shop.image,
          productImages, // Include preview images irrespective of location
          slug: shop.storeId || shop._id.toString(),
          category: shop.category,
          productIds: shop.products?.map((p: any) => p.toString()) || [],
          bgColor: shop.bgColor || "bg-neutral-50",
        };
      })
    );

    // 5. Trending Items (Fetch some popular categories or products)
    const trendingCategories = await Category.find({
      status: "Active",
    })
      .limit(5)
      .select("name image slug");

    const trending = trendingCategories.map((c) => ({
      id: c._id,
      name: c.name,
      image: c.image || `/assets/categories/${c.slug}.jpg`,
      type: "category",
    }));

    // 6. Personal Care Subcategories - Now handled by dynamic sections

    // 7. Cooking Ideas (Fetch some products from 'Food' or 'Grocery' categories)
    // We fetch these irrespective of location radius to show preview images
    const foodProductsQuery: any = {
      status: "Active",
      publish: true,
    };

    const foodProducts = await Product.find(foodProductsQuery)
      .limit(3)
      .select("productName mainImage");

    const cookingIdeas = foodProducts.map((p) => ({
      id: p._id,
      title: p.productName,
      image: p.mainImage,
      productId: p._id,
    }));

    // 8. Promo Cards (Simplified to use top categories)
    const promoCategories = await Category.find({
      status: "Active",
    })
      .sort({ order: 1 })
      .limit(4)
      .lean();

    const promoCards = await Promise.all(
      promoCategories.map(async (category: any) => {
        // Get subcategories for this category from SubCategory model
        const subcategories = await SubCategory.find({
          category: category._id,
        })
          .select("image")
          .limit(4)
          .lean();

        const subcategoryImages = subcategories
          .map((child: any) => child.image)
          .filter((img: string) => img && img.trim() !== "");

        return {
          id: category._id.toString(),
          badge: "Fresh & Healthy",
          title: category.name,
          categoryId: category._id.toString(),
          slug: category.slug || category._id.toString(),
          bgColor: "bg-green-50",
          subcategoryImages: subcategoryImages.slice(0, 4),
        };
      })
    );

    const finalPromoCards = promoCards.length > 0 ? promoCards : [];

    // 9. Category Hierarchy - Category → Subcategory → Products
    const allCategories = await Category.find({
      status: "Active",
    })
      .select("name slug image order")
      .sort({ order: 1 })
      .lean();

    const categoryHierarchy = await Promise.all(
      allCategories.map(async (category: any) => {
        // Get subcategories for this category
        const subcategories = await SubCategory.find({ category: category._id })
          .select("name image order")
          .sort({ order: 1 })
          .lean();

        // For each subcategory, get its products
        const subcatsWithProducts = await Promise.all(
          subcategories.map(async (subcat: any) => {
            const productQuery: any = {
              status: "Active",
              publish: true,
              subcategory: subcat._id,
              $or: [
                { isShopByStoreOnly: { $ne: true } },
                { isShopByStoreOnly: { $exists: false } },
              ],
            };

            const products = await Product.find(productQuery)
              .sort({ createdAt: -1 })
              .limit(20)
              .select("productName mainImage price mrp discount rating reviewsCount pack seller")
              .lean();

            return {
              id: subcat._id.toString(),
              name: subcat.name,
              image: subcat.image || "",
              products: products.map((p: any) => {
                const isAvailable = nearbySellerIds && nearbySellerIds.length > 0 && p.seller
                  ? nearbySellerIds.some(id => id.toString() === p.seller.toString())
                  : false;
                return {
                  id: p._id.toString(),
                  productId: p._id.toString(),
                  name: p.productName,
                  productName: p.productName,
                  image: p.mainImage,
                  mainImage: p.mainImage,
                  price: p.price,
                  mrp: p.mrp,
                  discount: p.discount || (p.mrp && p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
                  rating: p.rating || 0,
                  reviewsCount: p.reviewsCount || 0,
                  pack: p.pack || "",
                  isAvailable,
                  seller: p.seller,
                };
              }),
            };
          })
        );

        return {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
          image: category.image || "",
          subcategories: subcatsWithProducts.filter(s => s.products.length > 0),
        };
      })
    );

    // Filter out categories with no subcategories that have products
    const filteredHierarchy = categoryHierarchy.filter(c => c.subcategories.length > 0);

    res.status(200).json({
      success: true,
      data: {
        bestsellers,
        lowestPrices: validLowestPricesProducts, // Admin-selected products for LowestPricesEver section
        categories,
        // Category hierarchy (replaces homeSections)
        categoryHierarchy: filteredHierarchy,
        // Keep homeSections as empty array for backward compatibility
        homeSections: [],
        shops,
        promoBanners: [
          {
            id: 1,
            image:
              "https://img.freepik.com/free-vector/horizontal-banner-template-grocery-sales_23-2149432421.jpg",
            link: "/category/grocery",
          },
          {
            id: 2,
            image:
              "https://img.freepik.com/free-vector/flat-supermarket-social-media-cover-template_23-2149363385.jpg",
            link: "/category/snacks",
          },
        ],
        trending,
        cookingIdeas,
        promoCards: finalPromoCards, // Return dynamic or fallback cards
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching home content",
      error: error.message,
    });
  }
};

// Get Products for a specific "Store" (Campaign/Collection)
// Fetch products based on store configuration from database
export const getStoreProducts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { latitude, longitude } = req.query; // User location for filtering
    let query: any = {
      status: "Active",
      publish: true,
      // Only show shop-by-store-only products in shop by store section
      isShopByStoreOnly: true,
    };

    console.log(`[getStoreProducts] Looking for shop with storeId: ${storeId}`);

    // Build shop query - only include _id if storeId is a valid ObjectId
    const shopQuery: any = { isActive: true };
    if (mongoose.Types.ObjectId.isValid(storeId)) {
      shopQuery.$or = [
        { storeId: storeId.toLowerCase() },
        { _id: new mongoose.Types.ObjectId(storeId) }
      ];
    } else {
      shopQuery.storeId = storeId.toLowerCase();
    }

    // Find the shop by storeId or _id
    const shop = await Shop.findOne(shopQuery)
      .populate("category", "_id name slug image")
      .populate("subCategory", "_id name")
      .lean();

    console.log(`[getStoreProducts] Shop found:`, shop ? { name: shop.name, productsCount: shop.products?.length || 0, category: shop.category, image: shop.image } : 'NOT FOUND');

    let shopData: any = null;

    if (shop) {
      shopData = {
        name: shop.name,
        image: shop.image,
        description: shop.description || '',
        category: shop.category,
      };

      // Convert products array to ObjectIds if needed
      // When using .lean(), products array contains ObjectIds directly
      let productIds: mongoose.Types.ObjectId[] = [];
      if (shop.products && shop.products.length > 0) {
        productIds = shop.products.map((p: any) => {
          // Handle different formats: ObjectId, string, or object with _id
          if (mongoose.Types.ObjectId.isValid(p)) {
            return typeof p === 'string' ? new mongoose.Types.ObjectId(p) : p;
          }
          return p._id ? (typeof p._id === 'string' ? new mongoose.Types.ObjectId(p._id) : p._id) : p;
        }).filter(Boolean);
      }

      console.log(`[getStoreProducts] Shop has ${productIds.length} products assigned`);

      // Get shop ID for filtering
      const shopId = (shop as any)._id;

      // If shop has specific products assigned, use those
      if (productIds.length > 0) {
        query._id = { $in: productIds };
        // Also filter by shopId to ensure products belong to this shop
        query.shopId = shopId;
        console.log(`[getStoreProducts] Filtering by product IDs: ${productIds.length} products and shopId: ${shopId}`);
      }
      // Otherwise, filter by shopId and category/subcategory
      else {
        // Filter by shopId to show only products assigned to this shop
        query.shopId = shopId;
        console.log(`[getStoreProducts] Filtering by shopId: ${shopId}`);

        if (shop.category) {
          const categoryId = (shop.category as any)._id || (shop.category as any);
          query.category = categoryId;
          console.log(`[getStoreProducts] Also filtering by category: ${categoryId}`);

          // If subcategory is also specified, filter by both
          if (shop.subCategory) {
            const subCategoryId = (shop.subCategory as any)._id || (shop.subCategory as any);
            query.$or = [
              { category: categoryId, shopId: shopId },
              { subcategory: subCategoryId, shopId: shopId },
            ];
            console.log(`[getStoreProducts] Also filtering by subcategory: ${subCategoryId}`);
          }
        }
      }
    } else {
      // Fallback: try to match by category name (legacy support)
      const categoryId = await getCategoryIdByName(storeId);
      if (categoryId) {
        query.category = categoryId;
        // Try to get category details for shop data
        const category = await Category.findById(categoryId).select("name slug image").lean();
        if (category) {
          shopData = {
            name: category.name,
            image: category.image || '',
            description: '',
            category: category,
          };
        }
      } else {
        // No matching shop or category found
        return res.status(200).json({
          success: true,
          data: [],
          shop: null,
          message: "Store not found"
        });
      }
    }

    // Location-based filtering: Only show products from sellers within user's range
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    console.log(`[getStoreProducts] User location: lat=${userLat}, lng=${userLng}`);

    if (userLat && userLng && !isNaN(userLat) && !isNaN(userLng)) {
      const nearbySellerIds = await findSellersWithinRange(userLat, userLng);
      console.log(`[getStoreProducts] Found ${nearbySellerIds.length} sellers within range`);

      if (nearbySellerIds.length === 0) {
        // No sellers within range, return shop data but empty products
        console.log(`[getStoreProducts] No sellers in range, returning empty products`);
        return res.status(200).json({
          success: true,
          data: [],
          shop: shopData,
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            pages: 0,
          },
          message: "No sellers available in your area. Please update your location.",
        });
      }

      // Filter products by sellers within range
      query.seller = { $in: nearbySellerIds };
      console.log(`[getStoreProducts] Added seller filter to query`);
    } else {
      // If no location provided, return empty (require location for marketplace)
      console.log(`[getStoreProducts] No location provided, returning empty products`);
      return res.status(200).json({
        success: true,
        data: [],
        shop: shopData,
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
        message: "Location is required to view products. Please enable location access.",
      });
    }

    console.log(`[getStoreProducts] Final query:`, JSON.stringify(query, null, 2));

    const products = await Product.find(query)
      .populate("category", "name icon image")
      .populate("subcategory", "name")
      .populate("brand", "name")
      .populate("seller", "storeName")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean({ virtuals: true });

    const total = await Product.countDocuments(query);

    console.log(`[getStoreProducts] Found ${total} products matching query, returning ${products.length}`);

    return res.status(200).json({
      success: true,
      data: products.map(p => ({ ...p, isAvailable: true })),
      shop: shopData,
      pagination: {
        page: 1,
        limit: 50,
        total,
        pages: Math.ceil(total / 50),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching store products",
      error: error.message,
    });
  }
};

// Helper
async function getCategoryIdByName(name: string) {
  const cat = await Category.findOne({
    name: { $regex: new RegExp(name, "i") },
  });
  return cat ? cat._id : null;
}
