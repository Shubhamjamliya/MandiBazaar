import { Request, Response } from "express";
import Product from "../../../models/Product";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Shop from "../../../models/Shop";
// HomeSection import removed - replaced by Category hierarchy
import BestsellerCard from "../../../models/BestsellerCard";
import LowestPricesProduct from "../../../models/LowestPricesProduct";
import Banner from "../../../models/Banner";
import mongoose from "mongoose";
import { findSellersWithinRange, getAdminSellerIds } from "../../../utils/locationHelper";

// Get Home Page Content
export const getHomeContent = async (req: Request, res: Response) => {
  const { latitude, longitude } = req.query; // Get location from query params

  try {
    // Find sellers within user's location range
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;
    const locationProvided = userLat !== null && userLng !== null;

    let nearbySellerIds: mongoose.Types.ObjectId[] = [];
    if (locationProvided) {
      nearbySellerIds = await findSellersWithinRange(userLat!, userLng!);
    } else {
      // If no location, only show Admin sellers
      nearbySellerIds = await getAdminSellerIds();
    }

    // 1. Featured / Bestsellers - Get bestseller cards from admin configuration
    const bestsellerCards = await BestsellerCard.find({
      isActive: true,
    })
      .populate("category", "name slug image")
      .sort({ order: 1 })
      .limit(6)
      .lean();

    // For each bestseller card, get products from the associated category
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
            stock: { $gt: 0 },
          };

          // Fetch active products from the category for preview images
          const categoryProducts = await Product.find(productQuery)
            .select("productName mainImage galleryImages")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

          // Extract product images
          const productImages: string[] = [];
          categoryProducts.slice(0, 4).forEach((product: any) => {
            if (productImages.length < 4 && product.mainImage) {
              productImages.push(product.mainImage);
            }
          });

          if (productImages.length < 4) {
            categoryProducts.slice(0, 4).forEach((product: any) => {
              if (
                productImages.length < 4 &&
                product.galleryImages &&
                product.galleryImages.length > 0
              ) {
                productImages.push(product.galleryImages[0]);
              }
            });
          }

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

    // 1b. Bestseller Products for the horizontal slider
    const bestsellerProductsList: any[] = [];
    for (const card of bestsellerCards) {
      if (!card.category) continue;
      const categoryId = (card.category as any)._id || card.category;

      const productQuery: any = {
        category: categoryId,
        status: "Active",
        publish: true,
        stock: { $gt: 0 },
        $or: [
          { isShopByStoreOnly: { $ne: true } },
          { isShopByStoreOnly: { $exists: false } },
        ],
      };

      const products = await Product.find(productQuery)
        .select("productName mainImage price mrp discount pack variations smallDescription seller rating reviewsCount")
        .populate("seller", "workingHours isShopOpen")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      products.forEach((p: any) => {
        const isAvailable = (nearbySellerIds.length > 0 && p.seller) 
          ? nearbySellerIds.some(id => id.toString() === (p.seller?._id || p.seller)?.toString())
          : false;

        if (isAvailable) {
          bestsellerProductsList.push({
            id: p._id.toString(),
            _id: p._id.toString(),
            name: p.productName,
            productName: p.productName,
            imageUrl: p.mainImage,
            mainImage: p.mainImage,
            price: p.price,
            mrp: p.mrp || p.price,
            discount: p.discount || (p.mrp && p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
            pack: p.pack || p.variations?.[0]?.title || p.smallDescription || '',
            rating: p.rating || 0,
            reviewsCount: p.reviewsCount || 0,
            seller: p.seller,
            categoryId: categoryId.toString(),
            isAvailable: true,
          });
        }
      });
    }

    const lowestPricesProductsQuery: any = {
      isActive: true,
    };

    const lowestPricesProducts = await LowestPricesProduct.find(
      lowestPricesProductsQuery
    )
      .populate({
        path: "product",
        select:
          "productName mainImage price mrp compareAtPrice discount status publish category subcategory seller weightVariants variations sellingUnit pack smallDescription rating reviewsCount",
        populate: [
          { path: "category", select: "name slug" },
          { path: "seller", select: "workingHours isShopOpen" },
        ],
        match: {
          status: "Active",
          publish: true,
          stock: { $gt: 0 },
        },
      })
      .sort({ order: 1 })
      .lean();

    const validLowestPricesProducts = lowestPricesProducts
      .filter((item: any) => {
        const p = item.product;
        if (!p || !p.category) return false;
        
        // Strictly filter by location if provided
        const isAvailable = (nearbySellerIds.length > 0 && p.seller)
          ? nearbySellerIds.some(id => id.toString() === (p.seller._id || p.seller).toString())
          : false;
        
        return isAvailable;
      })
      .map((item: any) => {
        const product = item.product;
        return {
          id: product._id.toString(),
          _id: product._id.toString(),
          productName: product.productName,
          name: product.productName,
          mainImage: product.mainImage,
          imageUrl: product.mainImage,
          price: product.price,
          mrp: product.mrp || product.compareAtPrice || product.price,
          discount: product.discount || (product.mrp && product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0),
          categoryId: product.category?._id?.toString() || product.category?.toString() || "",
          subcategory: product.subcategory?.toString() || "",
          status: product.status,
          publish: product.publish,
          isAvailable: true,
          seller: product.seller,
          weightVariants: product.weightVariants || [],
          variations: product.variations || [],
          sellingUnit: product.sellingUnit || 'unit',
          pack: product.pack || '',
          rating: product.rating || 0,
          reviewsCount: product.reviewsCount || 0,
        };
      });

    // 3. Categories for Tiles
    const categories = await Category.find({
      status: "Active",
    })
      .select("name image icon color slug")
      .sort({ order: 1 })
      .lean();

    // 4. Shop By Store
    const shopDocuments = await Shop.find({ isActive: true })
      .populate("category", "name slug")
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const shopsPromise = await Promise.all(
      shopDocuments.map(async (shop: any) => {
        let productImages: string[] = [];

        if (shop.products && shop.products.length > 0) {
          const shopProducts = await Product.find({
            _id: { $in: shop.products.slice(0, 4) },
            status: "Active",
            publish: true,
            stock: { $gt: 0 },
            seller: { $in: nearbySellerIds },
          })
            .select("mainImage")
            .lean();

          productImages = shopProducts.map((p: any) => p.mainImage).filter(Boolean);
        }

        return {
          id: shop.storeId || shop._id.toString(),
          name: shop.name,
          image: shop.image,
          productImages,
          slug: shop.storeId || shop._id.toString(),
          category: shop.category,
          productIds: shop.products?.map((p: any) => p.toString()) || [],
          bgColor: shop.bgColor || "bg-neutral-50",
        };
      })
    );

    const shops = shopsPromise.filter(s => s.productImages && s.productImages.length > 0);

    // 5. Trending Items
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

    // 7. Cooking Ideas
    const foodProductsQuery: any = {
      status: "Active",
      publish: true,
      stock: { $gt: 0 },
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

    // 8. Promo Cards
    const promoCategories = await Category.find({
      status: "Active",
    })
      .sort({ order: 1 })
      .limit(4)
      .lean();

    const promoCards = await Promise.all(
      promoCategories.map(async (category: any) => {
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

    // 9. Category Hierarchy
    const allCategories = await Category.find({
      status: "Active",
    })
      .select("name slug image order")
      .sort({ order: 1 })
      .lean();

    const categoryHierarchy = await Promise.all(
      allCategories.map(async (category: any) => {
        const subcategories = await SubCategory.find({ category: category._id })
          .select("name image order")
          .sort({ order: 1 })
          .lean();

        const subcatsWithProducts = await Promise.all(
          subcategories.map(async (subcat: any) => {
            const productQuery: any = {
              status: "Active",
              publish: true,
              stock: { $gt: 0 },
              subcategory: subcat._id,
              $or: [
                { isShopByStoreOnly: { $ne: true } },
                { isShopByStoreOnly: { $exists: false } },
              ],
            };

            const products = await Product.find(productQuery)
              .sort({ createdAt: -1 })
              .limit(100)
              .select("productName mainImage price mrp compareAtPrice discount rating reviewsCount pack variations weightVariants sellingUnit seller")
              .populate("seller", "workingHours isShopOpen")
              .lean();

            const availableProducts = products.filter((p: any) => {
              const isAvailable = (nearbySellerIds.length > 0 && p.seller)
                ? nearbySellerIds.some(id => id.toString() === (p.seller._id || p.seller).toString())
                : false;
              return isAvailable;
            });

            return {
              id: subcat._id.toString(),
              name: subcat.name,
              image: subcat.image || "",
              products: availableProducts.map((p: any) => {
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
                  variations: p.variations || [],
                  weightVariants: p.weightVariants || [],
                  sellingUnit: p.sellingUnit || "unit",
                  isAvailable: true,
                  seller: p.seller,
                };
              }),
            };
          })
        );

        const directProductQuery: any = {
          status: "Active",
          publish: true,
          stock: { $gt: 0 },
          category: category._id,
          $or: [
            { subcategory: { $exists: false } },
            { subcategory: null },
          ],
          $and: [
            {
              $or: [
                { isShopByStoreOnly: { $ne: true } },
                { isShopByStoreOnly: { $exists: false } },
              ],
            },
          ],
        };

        const directProducts = await Product.find(directProductQuery)
          .sort({ createdAt: -1 })
          .limit(100)
          .select("productName mainImage price mrp compareAtPrice discount rating reviewsCount pack variations weightVariants sellingUnit seller")
          .populate("seller", "workingHours isShopOpen")
          .lean();

        const availableDirectProducts = directProducts.filter((p: any) => {
          const isAvailable = (nearbySellerIds.length > 0 && p.seller)
            ? nearbySellerIds.some(id => id.toString() === (p.seller._id || p.seller).toString())
            : false;
          return isAvailable;
        });

        const mappedDirectProducts = availableDirectProducts.map((p: any) => {
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
            variations: p.variations || [],
            weightVariants: p.weightVariants || [],
            sellingUnit: p.sellingUnit || "unit",
            isAvailable: true,
            seller: p.seller,
          };
        });

        const allSubcats = subcatsWithProducts.filter(s => s.products.length > 0);
        if (mappedDirectProducts.length > 0) {
          allSubcats.push({
            id: `${category._id.toString()}_direct`,
            name: category.name,
            image: category.image || "",
            products: mappedDirectProducts,
          });
        }

        return {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
          image: category.image || "",
          subcategories: allSubcats,
        };
      })
    );

    // Keep all active categories in hierarchy for consistency with top tiles
    const filteredHierarchy = categoryHierarchy; 

    // Fetch active banners
    const activeBanners = await Banner.find({ isActive: true }).sort({ order: 1 }).lean();

    const promoBanners = activeBanners.filter(b => b.type === 'carousel');
    const extraBanner1 = activeBanners.filter(b => b.type === 'banner-1');
    const extraBanner3 = activeBanners.filter(b => b.type === 'banner-3');
    const marqueeBanner = activeBanners.find(b => b.type === 'marquee');
    const marqueeText = (marqueeBanner as any)?.text || '';

    const finalPromoBanners = promoBanners.length > 0 ? promoBanners : [
      {
        id: 1,
        image: "https://img.freepik.com/free-vector/horizontal-banner-template-grocery-sales_23-2149432421.jpg",
        link: "/category/grocery",
      },
      {
        id: 2,
        image: "https://img.freepik.com/free-vector/flat-supermarket-social-media-cover-template_23-2149363385.jpg",
        link: "/category/snacks",
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        bestsellers,
        bestsellerProducts: bestsellerProductsList,
        lowestPrices: validLowestPricesProducts,
        categories,
        categoryHierarchy: filteredHierarchy,
        homeSections: [],
        shops,
        promoBanners: finalPromoBanners,
        extraBanner1,
        extraBanner3,
        marqueeText,
        trending,
        cookingIdeas,
        promoCards: finalPromoCards,
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

// Get Products for a specific "Store"
export const getStoreProducts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { latitude, longitude } = req.query;
    let query: any = {
      status: "Active",
      publish: true,
      stock: { $gt: 0 },
      isShopByStoreOnly: true,
    };

    const shopQuery: any = { isActive: true };
    if (mongoose.Types.ObjectId.isValid(storeId)) {
      shopQuery.$or = [
        { storeId: storeId.toLowerCase() },
        { _id: new mongoose.Types.ObjectId(storeId) }
      ];
    } else {
      shopQuery.storeId = storeId.toLowerCase();
    }

    const shop = await Shop.findOne(shopQuery)
      .populate("category", "_id name slug image")
      .populate("subCategory", "_id name")
      .lean();

    let shopData: any = null;

    if (shop) {
      shopData = {
        name: shop.name,
        image: shop.image,
        description: shop.description || '',
        category: shop.category,
      };

      let productIds: mongoose.Types.ObjectId[] = [];
      if (shop.products && shop.products.length > 0) {
        productIds = shop.products.map((p: any) => {
          if (mongoose.Types.ObjectId.isValid(p)) {
            return typeof p === 'string' ? new mongoose.Types.ObjectId(p) : p;
          }
          return p._id ? (typeof p._id === 'string' ? new mongoose.Types.ObjectId(p._id) : p._id) : p;
        }).filter(Boolean);
      }

      const shopId = (shop as any)._id;

      if (productIds.length > 0) {
        query._id = { $in: productIds };
        query.shopId = shopId;
      }
      else {
        query.shopId = shopId;

        if (shop.category) {
          const categoryId = (shop.category as any)._id || (shop.category as any);
          query.category = categoryId;

          if (shop.subCategory) {
            const subCategoryId = (shop.subCategory as any)._id || (shop.subCategory as any);
            query.$or = [
              { category: categoryId, shopId: shopId },
              { subcategory: subCategoryId, shopId: shopId },
            ];
          }
        }
      }
    } else {
      const categoryId = await getCategoryIdByName(storeId);
      if (categoryId) {
        query.category = categoryId;
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
        return res.status(200).json({
          success: true,
          data: [],
          shop: null,
          message: "Store not found"
        });
      }
    }

    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    if (userLat && userLng && !isNaN(userLat) && !isNaN(userLng)) {
      const nearbySellerIds = await findSellersWithinRange(userLat, userLng);

      if (nearbySellerIds.length === 0) {
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

      query.seller = { $in: nearbySellerIds };
    } else {
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

    const products = await Product.find(query)
      .populate("category", "name icon image")
      .populate("subcategory", "name")
      .populate("brand", "name")
      .populate("seller", "storeName workingHours isShopOpen")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean({ virtuals: true });

    const total = await Product.countDocuments(query);

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
