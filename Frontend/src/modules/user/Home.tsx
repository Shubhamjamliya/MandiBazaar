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
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import PageLoader from "../../components/PageLoader";

import { useThemeContext } from "../../context/ThemeContext";

export default function Home() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { activeCategory, setActiveCategory } = useThemeContext();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const activeTab = activeCategory; // mapping for existing code compatibility
  const setActiveTab = setActiveCategory;
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollHandledRef = useRef(false);
  const SCROLL_POSITION_KEY = 'home-scroll-position';

  // State for dynamic data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>({
    bestsellers: [],
    categories: [],
    categoryHierarchy: [], // Category → Subcategory → Product hierarchy
    shops: [],
    promoBanners: [],
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

  // Removed independent category fetching to ensure global Fruits/Vegetables filter is respected

  const handleCategorySelect = async (category: any) => {
    const categoryId = category.categoryId || category.id || category._id;

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
      <div className="h-[120px]"></div>

      {/* Hero Banner - Show promo banners from backend */}
      <SimpleBanner banners={homeData.promoBanners} />

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
            <InlineCategoryFlow
              categoryId={activeInlineCategory.categoryId || activeInlineCategory.id}
              categorySlug={activeInlineCategory.slug}
              categoryName={activeInlineCategory.name}
              subcategories={inlineSubcategories}
              products={inlineProducts}
              isLoading={isInlineLoading}
            />
          )}
        </>
      )}

      {/* Main content */}
      <div className="space-y-4 pt-4">

        {/* Category Hierarchy - Category → Subcategory → Products */}
        {homeData.categoryHierarchy && homeData.categoryHierarchy.length > 0 && (
          <>
            {homeData.categoryHierarchy
              .filter((cat: any) => {
                const catId = (cat.id || cat._id)?.toString();
                const activeId = (activeInlineCategory?.categoryId || activeInlineCategory?.id)?.toString();
                return catId !== activeId;
              })
              .map((category: any, catIndex: number) => {
                return (
                  <div key={category.id || category._id}>
                    <InlineCategoryFlow
                      categoryId={category.id || category._id}
                      categorySlug={category.slug}
                      categoryName={category.name}
                      subcategories={category.subcategories || []}
                      products={(category.subcategories || []).flatMap((sub: any) =>
                        (sub.products || []).map((p: any) => ({
                          ...p,
                          // Ensure product has subcategory ID for tab matching
                          subcategoryId: (sub._id || sub.id)?.toString()
                        }))
                      )}
                      isLoading={false}
                    />

                    {/* Add banner after every 2 categories */}
                    {(catIndex + 1) % 2 === 0 && (
                      <InlineBanner
                        images={["/banners/first.png", "/banners/second.png", "/banners/third.png"]}
                      />
                    )}
                  </div>
                );
              })}
          </>
        )}

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

        {/* Bestsellers Section (Global Only) */}
        {activeTab === "all" && (
          <>
            <div className="bg-white/95 backdrop-blur-sm py-6 mb-4 rounded-2xl mx-2 shadow-sm">
              <CategoryTileSection
                title="Bestsellers"
                tiles={
                  homeData.bestsellers && homeData.bestsellers.length > 0
                    ? homeData.bestsellers
                      .slice(0, 6)
                      .map((card: any) => {
                        // Bestseller cards have categoryId and productImages array from backend
                        return {
                          id: card.id,
                          categoryId: card.categoryId,
                          name: card.name || "Category",
                          productImages: card.productImages || [],
                          productCount: card.productCount || 0,
                        };
                      })
                    : []
                }
                columns={3}
                showProductCount={true}
              />
            </div>

            {/* Inline Banner after Bestsellers */}
            <InlineBanner
              images={["/banners/first.png", "/banners/second.png", "/banners/third.png"]}
            />

            {/* Featured this week Section */}
            <div className="bg-white/95 backdrop-blur-sm py-6 mb-4 rounded-2xl mx-2 shadow-sm">
              <FeaturedThisWeek />
            </div>

            {/* Inline Banner after Featured */}
            <InlineBanner
              images={["/banners/first.png", "/banners/second.png", "/banners/third.png"]}
            />

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
          </>
        )}
      </div>
    </div>
  );
}

