import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HomsterHeader from "./components/HomsterHeader";
import ServiceCategoriesSection from "./components/ServiceCategoriesSection";
import SimpleBanner from "./components/SimpleBanner";
import InlineBanner from "./components/InlineBanner";
import LowestPricesEver from "./components/LowestPricesEver";
import CategoryTileSection from "./components/CategoryTileSection";
import FeaturedThisWeek from "./components/FeaturedThisWeek";
import ProductCard from "./components/ProductCard";
import InlineCategoryFlow from "./components/InlineCategoryFlow";
import { getHomeContent } from "../../services/api/customerHomeService";
import { getCategories, getSubcategories } from "../../services/api/categoryService";
import { getProducts as getCustomerProducts } from "../../services/api/customerProductService";
import CategoryProductSlider from "./components/CategoryProductSlider";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import PageLoader from "../../components/PageLoader";

import { useThemeContext } from "../../context/ThemeContext";
import { useCart } from "../../context/CartContext";
import { calculateProductPrice } from "../../utils/priceUtils";
import WishlistButton from "../../components/WishlistButton";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { activeCategory, setActiveCategory } = useThemeContext();
  const { cart, addToCart, updateQuantity } = useCart();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const activeTab = activeCategory; // mapping for existing code compatibility
  const setActiveTab = setActiveCategory;
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollHandledRef = useRef(false);
  const [bestsellerProducts, setBestsellerProducts] = useState<any[]>([]);
  const SCROLL_POSITION_KEY = 'home-scroll-position';

  // State for dynamic data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>({
    bestsellers: [],
    bestsellerProducts: [],
    categories: [],
    categoryHierarchy: [], // Category → Subcategory → Product hierarchy
    shops: [],
    promoBanners: [],
    extraBanner1: [],
    extraBanner3: [],
    marqueeText: '',
    trending: [],
    cookingIdeas: [],
  });

  const [products, setProducts] = useState<any[]>([]);

  // Memoize service categories from homeData to ensure filtering is respected
  const serviceCategories = useMemo(() => {
    if (!homeData.categories) return [];
    return homeData.categories.map((cat: any) => ({
      id: cat._id || cat.id,
      name: cat.name,
      image: cat.image,
      categoryId: cat._id || cat.id,
      slug: cat.slug,
    }));
  }, [homeData.categories]);

  // State for Inline Category Flow
  const [activeInlineCategory, setActiveInlineCategory] = useState<any>(null);
  const [inlineSubcategories, setInlineSubcategories] = useState<any[]>([]);
  const [inlineProducts, setInlineProducts] = useState<any[]>([]);
  const [isInlineLoading, setIsInlineLoading] = useState(false);

  // Function to save scroll position before navigation
  const saveScrollPosition = () => {
    const mainElement = document.querySelector('main');
    const scrollPos = Math.max(
      mainElement ? mainElement.scrollTop : 0,
      window.scrollY || 0,
      document.documentElement.scrollTop || 0
    );
    if (scrollPos > 0) {
      sessionStorage.setItem(SCROLL_POSITION_KEY, scrollPos.toString());
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        startRouteLoading();
        setLoading(true);
        setError(null);
        // Pass the activeTab as the headerCategorySlug
        const response = await getHomeContent(
          activeTab,
          location?.latitude,
          location?.longitude
        );
        if (response.success && response.data) {
          setHomeData(response.data);

          // Use bestsellerProducts from home API (sourced from BestsellerCard DB schema)
          if (response.data.bestsellerProducts && response.data.bestsellerProducts.length > 0) {
            const mapped = response.data.bestsellerProducts.map((p: any) => ({
              ...p,
              id: p._id || p.id,
              name: (p.productName || p.name || '').replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim(),
              imageUrl: p.mainImage || p.imageUrl,
              mrp: p.mrp || p.price,
              pack: p.pack || p.variations?.[0]?.title || p.smallDescription || 'Standard'
            }));
            setBestsellerProducts(mapped);
          }

          if (response.data.bestsellers) {
            setProducts(response.data.bestsellers);
          }
        } else {
          setError("Failed to load content. Please try again.");
        }
      } catch (error) {
        console.error("Failed to fetch home content", error);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
        stopRouteLoading();
      }
    };

    fetchData();

  }, [location?.latitude, location?.longitude, activeTab]);

  // Removed separate bestseller fetch — now populated from homeData.bestsellerProducts
  // (sourced from BestsellerCard DB schema via home content API)

  // Removed independent category fetching to ensure global Fruits/Vegetables filter is respected

  const handleCategorySelect = async (category: any) => {
    const categoryId = category.categoryId || category.id || category._id;

    // Handle Home redirect/reset
    if (categoryId === 'home-redirect') {
      setActiveInlineCategory(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Also scroll the main container if it exists
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Toggle off if clicking the same one
    if (activeInlineCategory && (activeInlineCategory.categoryId || activeInlineCategory.id) === categoryId) {
      setActiveInlineCategory(null);
      return;
    }

    setActiveInlineCategory(category);
    setIsInlineLoading(true);

    try {
      // Fetch subcategories and products in parallel
      const [subcatsRes, productsRes] = await Promise.all([
        getSubcategories(categoryId),
        getCustomerProducts({ category: categoryId, latitude: location?.latitude, longitude: location?.longitude })
      ]);

      if (subcatsRes.success) {
        setInlineSubcategories(subcatsRes.data);
      }

      if (productsRes.success) {
        setInlineProducts(productsRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch category details for inline flow:", err);
    } finally {
      setIsInlineLoading(false);
    }
  };

  // Restore scroll position when returning to this page
  useEffect(() => {
    // Only restore scroll after data has loaded
    if (!loading && homeData.shops) {
      // Use a ref to ensure we only handle initial scroll once per mount
      if (scrollHandledRef.current) return;
      scrollHandledRef.current = true;

      const savedScrollPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (savedScrollPosition) {
        const scrollY = parseInt(savedScrollPosition, 10);

        const performScroll = () => {
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTop = scrollY;
          }
          window.scrollTo(0, scrollY);
        };

        // Try multiple times to ensure scroll is applied even if content is still rendering
        requestAnimationFrame(() => {
          performScroll();
          requestAnimationFrame(() => {
            performScroll();
            // Final fallback after a small delay for any late-rendering content
            setTimeout(performScroll, 100);
            setTimeout(performScroll, 300);
          });
        });

        // Clear the saved position after some time to ensure AppLayout can also see it if needed
        // but Home.tsx is the primary restorer now.
        setTimeout(() => {
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
        }, 1000);
      } else {
        // No saved position, ensure we start at the top
        const performReset = () => {
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTop = 0;
          }
          window.scrollTo(0, 0);
        };
        requestAnimationFrame(performReset);
        setTimeout(performReset, 100);
      }
    }
  }, [loading, homeData.shops]);

  // Global click/touch listener to save scroll position before any navigation
  useEffect(() => {
    const handleNavigationEvent = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // If clicking a link, button, or any element with cursor-pointer (like product cards/store tiles)
      if (target.closest('a') || target.closest('button') || target.closest('[role="button"]') || target.closest('.cursor-pointer')) {
        saveScrollPosition();
      }
    };

    window.addEventListener('click', handleNavigationEvent, { capture: true });
    window.addEventListener('touchstart', handleNavigationEvent, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', handleNavigationEvent, { capture: true });
      window.removeEventListener('touchstart', handleNavigationEvent, { capture: true });
    };
  }, []);

  // Removed duplicate saveScrollPosition
  const getFilteredProducts = (tabId: string) => {
    if (tabId === "all") {
      return products;
    }
    return products.filter(
      (p) =>
        p.categoryId === tabId ||
        (p.category && (p.category._id === tabId || p.category.slug === tabId))
    );
  };

  const filteredProducts = useMemo(
    () => getFilteredProducts(activeTab),
    [activeTab, products]
  );

  if (loading && !products.length && !homeData.categoryHierarchy?.length) {
    return <PageLoader />; // Let the global IconLoader handle the initial loading state
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-green-100 via-green-50 to-green-50/20 min-h-screen pb-20 md:pb-0" ref={contentRef}>
      {/* Homster Header */}
      <HomsterHeader />

      {/* Spacer for fixed header */}
      <div className="h-[140px]"></div>

      {/* Hero Banner - Show promo banners from backend */}
      {!activeInlineCategory && <SimpleBanner banners={homeData.promoBanners} />}

      {/* Marquee Announcement Strip */}
      {homeData.marqueeText && !activeInlineCategory && (
        <div className="w-full overflow-hidden bg-gradient-to-r from-green-600 to-emerald-500 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-700 px-3 py-2 flex items-center gap-1.5">
              <span className="text-white text-xs font-bold tracking-wide whitespace-nowrap">🎉 OFFER</span>
            </div>
            <div className="flex-1 overflow-hidden py-2 px-3">
              <div
                className="flex whitespace-nowrap"
                style={{
                  animation: 'marqueeScroll 18s linear infinite',
                }}
              >
                <span className="text-white text-xs font-semibold pr-16">{homeData.marqueeText}</span>
                <span className="text-white text-xs font-semibold pr-16">{homeData.marqueeText}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Categories Section */}
      {serviceCategories && serviceCategories.length > 0 && (
        <>
          <ServiceCategoriesSection
            categories={serviceCategories}
            activeCategoryId={activeInlineCategory ? (activeInlineCategory.categoryId || activeInlineCategory.id) : null}
            onCategorySelect={handleCategorySelect}
          />

          {/* Inline Category Flow (Subcategories + Products) */}
          {activeInlineCategory && (
            <div className="pt-4">
              <InlineCategoryFlow
                categoryId={activeInlineCategory.categoryId || activeInlineCategory.id}
                categorySlug={activeInlineCategory.slug}
                categoryName={activeInlineCategory.name}
                subcategories={inlineSubcategories}
                products={inlineProducts}
                isLoading={isInlineLoading}
              />
            </div>
          )}
        </>
      )}

      {/* Main content - Only show other sections if NO category is active */}
      {!activeInlineCategory && (
        <div className="space-y-4 pt-4">


          {/* Filtered Products Section (Legacy fallback if no category hierarchy, or complementary) */}
          {activeTab !== "all" && filteredProducts.length > 0 && homeData.categoryHierarchy?.length === 0 && (
            <div data-products-section className="bg-white/95 backdrop-blur-sm py-6 mb-4 rounded-2xl mx-2 shadow-sm">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 px-4 md:px-6 lg:px-8 capitalize">
                {activeTab === "grocery" ? "Grocery Items" : activeTab}
              </h2>
              <div className="px-4 md:px-6 lg:px-8">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      categoryStyle={true}
                      showBadge={true}
                      showPackBadge={false}
                      showStockInfo={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Category-Specific Product Sliders (Dynamic Sections) */}
      {activeTab === "all" && homeData.categoryHierarchy && homeData.categoryHierarchy.length > 0 && (
        <div className="space-y-4">
          {/* Bestsellers Section (Global Only) */}
          {activeTab === "all" && bestsellerProducts.length > 0 && (
            <div className="bg-white/95 backdrop-blur-sm py-5 mb-4 rounded-2xl mx-2 shadow-sm border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900 mb-3 px-4">Bestsellers</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-4" style={{ scrollSnapType: 'x mandatory' }}>
                {bestsellerProducts.map((product) => {
                  const { displayPrice, mrp, discount, hasDiscount } = calculateProductPrice(product);
                  const cartItem = cart.items.find(item => item?.product && (item.product.id === product.id || item.product._id === product.id));
                  const inCartQty = cartItem?.quantity || 0;

                  return (
                    <div
                      key={product.id}
                      className="flex-shrink-0 w-[140px]"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="bg-white rounded-xl overflow-hidden flex flex-col relative h-full border border-neutral-100/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                        <div
                          onClick={() => navigate(`/product/${product.id}`)}
                          className="relative block cursor-pointer"
                        >
                          <div className="w-full h-28 bg-neutral-50 flex items-center justify-center overflow-hidden relative">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-4xl">
                                {product.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {discount > 0 && (
                              <div className="absolute top-1.5 left-1.5 z-10 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                {discount}% OFF
                              </div>
                            )}
                            <WishlistButton productId={product.id} size="sm" className="top-1.5 right-1.5 shadow-sm" />
                            <div className="absolute bottom-1.5 right-1.5 z-10">
                              <AnimatePresence mode="wait">
                                {inCartQty === 0 ? (
                                  <motion.button
                                    key="add-button"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      addToCart(product, e.currentTarget);
                                    }}
                                    className="bg-white/95 backdrop-blur-sm text-green-600 border border-green-600 text-[10px] font-bold px-2.5 py-1 rounded shadow-md hover:bg-white transition-colors"
                                  >
                                    ADD
                                  </motion.button>
                                ) : (
                                  <motion.div
                                    key="stepper"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-1.5 bg-green-600 rounded px-1.5 py-1 shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        updateQuantity(product.id, inCartQty - 1);
                                      }}
                                      className="w-4 h-4 flex items-center justify-center text-white font-bold hover:bg-green-700 rounded transition-colors"
                                    >
                                      −
                                    </button>
                                    <span className="text-white font-bold min-w-[0.75rem] text-center text-[12px]">{inCartQty}</span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        updateQuantity(product.id, inCartQty + 1);
                                      }}
                                      className="w-4 h-4 flex items-center justify-center text-white font-bold hover:bg-green-700 rounded transition-colors"
                                    >
                                      +
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 flex-1 flex flex-col bg-white">
                          <div onClick={() => navigate(`/product/${product.id}`)} className="mb-1 cursor-pointer">
                            <h3 className="text-[10px] font-bold text-neutral-900 line-clamp-2 leading-tight">{product.name}</h3>
                          </div>
                          <div className="flex items-center gap-0.5 mb-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} width="7" height="7" viewBox="0 0 24 24" fill={i < 4 ? '#fbbf24' : '#e5e7eb'} xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-[8px] text-neutral-500">(50+)</span>
                          </div>
                          <div className="flex items-center justify-between mt-auto mb-1">
                            <span className="text-[8px] text-neutral-500 font-medium uppercase">15 MINS</span>
                            <span className="text-[8px] text-neutral-500">{product.pack}</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-neutral-900">₹{displayPrice.toLocaleString('en-IN')}</span>
                            {hasDiscount && <span className="text-[9px] text-neutral-400 line-through">₹{mrp.toLocaleString('en-IN')}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {homeData.categoryHierarchy.map((category: any, catIndex: number) => (
            <div key={category.id || category._id}>
              <CategoryProductSlider category={category} />

              {/* Banner every 2 categories */}
              {(catIndex + 1) % 2 === 0 && homeData.extraBanner1?.[Math.floor(catIndex / 2)] && (
                <div className="mb-4">
                  <InlineBanner
                    banners={[{
                      image: homeData.extraBanner1[Math.floor(catIndex / 2)].image,
                      link: homeData.extraBanner1[Math.floor(catIndex / 2)].link
                    }]}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Featured this week Section */}
          <div className="bg-white/95 backdrop-blur-sm py-6 mb-4 rounded-2xl mx-2 shadow-sm">
            <FeaturedThisWeek />
          </div>

          {/* Single Banner after Featured */}
          {homeData.extraBanner3?.map((banner: any) => (
            <InlineBanner key={banner._id} banners={[{ image: banner.image, link: banner.link }]} />
          ))}

          {/* Shop by Store Section */}
          <div className="bg-white/95 backdrop-blur-sm py-6 mb-4 rounded-2xl mx-2 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 px-4 md:px-6 lg:px-8">
              Shop by Store
            </h2>
            <div className="px-4 md:px-6 lg:px-8">
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                {(homeData.shops || []).map((tile: any) => {
                  const hasImages =
                    tile.image ||
                    (tile.productImages &&
                      tile.productImages.filter(Boolean).length > 0);

                  return (
                    <div key={tile.id} className="flex flex-col">
                      <div
                        onClick={() => {
                          const storeSlug =
                            tile.slug || tile.id.replace("-store", "");
                          saveScrollPosition();
                          navigate(`/store/${storeSlug}`);
                        }}
                        className="block bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:scale-105 transition-all cursor-pointer overflow-hidden">
                        {hasImages ? (
                          <img
                            src={
                              tile.image ||
                              (tile.productImages
                                ? tile.productImages[0]
                                : "")
                            }
                            alt={tile.name}
                            className="w-full h-20 object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-20 flex items-center justify-center text-3xl font-bold ${tile.bgColor || "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600"
                              }`}>
                            {tile.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Tile name - outside card */}
                      <div className="mt-2 text-center">
                        <span className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
                          {tile.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
