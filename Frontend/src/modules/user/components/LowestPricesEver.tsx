import { useRef, useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts } from '../../../services/api/customerProductService';

import { getTheme } from '../../../utils/themes';
import { useCart } from '../../../context/CartContext';
import { Product } from '../../../types/domain';
import { useWishlist } from '../../../hooks/useWishlist';
import { calculateProductPrice } from '../../../utils/priceUtils';

import { getVariantStyle } from '../../../utils/variantStyleUtils';
import VariantSelectorModal from './VariantSelectorModal';

interface LowestPricesEverProps {
  activeTab?: string;
  products?: Product[]; // Admin-selected products from home data
}

// Helper function to truncate text to a maximum length
const truncateText = (text: string, maxLength: number = 60): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Product Card Component - Defined outside to prevent recreation on every render
const ProductCard = memo(({
  product,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
  onShowVariants
}: {
  product: Product;
  cartQuantity: number;
  onAddToCart: (product: Product, element?: HTMLElement | null) => void;
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string, variantTitle?: string) => void;
  onShowVariants: (product: Product) => void;
}) => {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist(product.id);

  // Get Price and MRP using utility
  let { displayPrice, mrp, discount, hasDiscount } = calculateProductPrice(product);

  const isWeightMode = (product as any).sellingUnit === 'weight';
  const weightVariants: any[] = (product as any).weightVariants || [];

  const actingWeightVariant = isWeightMode
    ? [...weightVariants].filter((v: any) => v.isEnabled).sort((a: any, b: any) => a.grams - b.grams)[0]
    : null;

  const actingQuantityVariant = !isWeightMode && product.variations && product.variations.length > 0
    ? product.variations[0]
    : null;

  const actingVariantIdString = (id: any) => {
    if (!id) return undefined;
    return typeof id === 'string' ? id : (id.$oid || String(id));
  };

  const actingVariantId = isWeightMode
    ? (actingWeightVariant ? `wv_${actingWeightVariant.label}` : undefined)
    : actingVariantIdString(actingQuantityVariant?._id);

  const actingVariantTitle = isWeightMode
    ? actingWeightVariant?.label
    : (actingQuantityVariant?.title || actingQuantityVariant?.value || product.pack);

  if (isWeightMode && actingWeightVariant) {
    const vPrice = Number(actingWeightVariant.price) || 0;
    const vMrp = Number(actingWeightVariant.mrp) || Number(product.mrp) || Number(product.compareAtPrice) || vPrice;

    if (vPrice > 0) {
      displayPrice = vPrice;
      mrp = vMrp;
      if (mrp > displayPrice) {
        discount = Math.round(((mrp - displayPrice) / mrp) * 100);
      } else {
        discount = 0;
      }
      hasDiscount = discount > 0;
    }
  }

  // Use cartQuantity from props
  const inCartQty = cartQuantity;

  // Get product name, clean it
  let productName = product.name || product.productName || '';
  productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();
  const displayName = truncateText(productName, 60);

  const variationsCount = (product.variations?.length || 0);
  const weightVariantsCount = weightVariants.filter((v: any) => v.isEnabled).length;
  const optionsCount = Math.max(variationsCount, weightVariantsCount);

  const variantLabel = actingVariantTitle || '1 piece';
  const variantStyle = getVariantStyle(variantLabel);

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.isAvailable === false) return;

    if (optionsCount > 1) {
      onShowVariants(product);
    } else {
      if (isWeightMode && actingWeightVariant) {
        onAddToCart({
          ...product,
          price: actingWeightVariant.price,
          mrp: actingWeightVariant.mrp || actingWeightVariant.price,
          pack: actingWeightVariant.label,
          variantTitle: actingWeightVariant.label,
          variantId: `wv_${actingWeightVariant.label}`,
          selectedWeightVariant: actingWeightVariant,
        }, e.currentTarget as HTMLElement);
      } else if (actingQuantityVariant) {
        onAddToCart({
          ...product,
          price: actingQuantityVariant.discPrice || actingQuantityVariant.price,
          mrp: actingQuantityVariant.price,
          pack: actingQuantityVariant.title || actingQuantityVariant.value || product.pack,
          selectedVariant: actingQuantityVariant,
          variantId: actingVariantId,
          variantTitle: actingVariantTitle,
        }, e.currentTarget as HTMLElement);
      } else {
        onAddToCart(product, e.currentTarget as HTMLElement);
      }
    }
  };

  return (
    <div
      className="flex-shrink-0 w-[140px]"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-white rounded-lg overflow-hidden flex flex-col relative h-full max-h-full cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-100"
      >
        {/* Product Image Area */}
        <div className="relative block">
          <div className="w-full h-28 bg-neutral-100 flex items-center justify-center overflow-hidden relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-4xl">
                {(product.name || product.productName || '?').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Red Discount Badge - Top Left */}
            {discount > 0 && (
              <div className="absolute top-1.5 left-1.5 z-10 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {discount}% OFF
              </div>
            )}

            {/* Options Badge */}
            {optionsCount >= 2 && (
              <div className="absolute bottom-1.5 left-1.5 z-10">
                <span className="text-[9px] font-bold text-neutral-700 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border border-neutral-100 uppercase tracking-tighter">
                  {optionsCount} OPTIONS
                </span>
              </div>
            )}

            {/* Heart Icon - Top Right */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(e);
              }}
              className="absolute top-1.5 right-1.5 z-30 w-7 h-7 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "#ef4444" : "none"}
                xmlns="http://www.w3.org/2000/svg"
                className={isWishlisted ? "text-red-500" : "text-neutral-500"}
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Product Details */}
        <div className="p-2 flex-1 flex flex-col min-h-0 bg-white">
          {/* Variant Tag */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-tight ${variantStyle.bg} ${variantStyle.text} ${variantStyle.border}`}>
              {variantLabel}
            </span>
          </div>

          {/* Product Name */}
          <div className="mb-1.5">
            <h3 className="text-[11px] font-bold text-neutral-900 line-clamp-2 leading-tight min-h-[2.2rem] max-h-[2.2rem] overflow-hidden" title={productName}>
              {displayName}
            </h3>
          </div>

          {/* Pricing Area */}
          <div className="mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-black text-neutral-900 leading-none">
                ₹{displayPrice.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-neutral-400 line-through font-medium leading-none">
                  ₹{mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          {/* ADD Button or Quantity Stepper */}
          <div className="mt-auto pt-1">
            <AnimatePresence mode="wait">
              {inCartQty === 0 ? (
                <motion.button
                  key="add-button"
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  disabled={product.isAvailable === false}
                  onClick={handleAddClick}
                  className={`w-full h-8 text-[11px] font-bold rounded-full uppercase tracking-wider transition-all shadow-sm ${product.isAvailable === false
                    ? 'bg-neutral-50 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                    : 'bg-white text-green-600 border border-green-600 hover:bg-green-50'
                    }`}
                >
                  {product.isAvailable === false ? 'Out of Range' : 'ADD'}
                </motion.button>
              ) : (
                <motion.div
                  key="stepper"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between bg-green-600 rounded-full h-8 px-1 shadow-md shadow-green-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUpdateQuantity(product.id, inCartQty - 1, actingVariantId, actingVariantTitle);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-white font-bold hover:bg-green-700 rounded-full transition-colors leading-none"
                  >
                    <span className="text-sm font-bold">−</span>
                  </motion.button>
                  <motion.span
                    key={inCartQty}
                    initial={{ scale: 1.2, y: -2 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="text-white font-black text-[12px] min-w-[0.75rem] text-center"
                  >
                    {inCartQty}
                  </motion.span>
                  <motion.button
                    whileTap={product.isAvailable === false ? {} : { scale: 0.9 }}
                    disabled={product.isAvailable === false}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUpdateQuantity(product.id, inCartQty + 1, actingVariantId, actingVariantTitle);
                    }}
                    className={`w-6 h-6 flex items-center justify-center font-bold rounded-full transition-colors leading-none ${product.isAvailable === false
                      ? 'text-neutral-300 cursor-not-allowed'
                      : 'text-white hover:bg-green-700'
                      }`}
                  >
                    <span className="text-sm font-bold">+</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.cartQuantity === nextProps.cartQuantity &&
    prevProps.product.isAvailable === nextProps.product.isAvailable
  );
});

ProductCard.displayName = 'ProductCard';

export default function LowestPricesEver({ activeTab = 'all', products: adminProducts }: LowestPricesEverProps) {
  const theme = getTheme(activeTab);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { cart } = useCart();
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);

  // Preload and wait for font to load to prevent FOUT
  useEffect(() => {
    if (document.fonts && document.fonts.check) {
      if (document.fonts.check('1em "Poppins"')) {
        setFontLoaded(true);
        return;
      }
      const checkFont = async () => {
        try {
          await document.fonts.load('1em "Poppins"');
          setFontLoaded(true);
        } catch (e) {
          setTimeout(() => setFontLoaded(true), 300);
        }
      };
      checkFont();
    } else {
      setTimeout(() => setFontLoaded(true), 300);
    }
  }, []);

  // Memoize cart items lookup
  const cartItemsMap = useMemo(() => {
    const map = new Map();
    cart.items.forEach(item => {
      const productId = item.product.id || item.product._id;
      if (productId) {
        // For multiple variants, we might need a more complex key, 
        // but for global count per product in this section:
        const currentCount = map.get(productId) || 0;
        map.set(productId, currentCount + item.quantity);
      }
    });
    return map;
  }, [cart.items]);

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (adminProducts && adminProducts.length > 0) {
      const mappedProducts = adminProducts.map((p: any) => {
        let productName = p.productName || p.name || '';
        productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();

        let packValue = p.pack || p.variations?.[0]?.title || p.variations?.[0]?.value || 'Standard';
        if (packValue && packValue.includes(' - ')) {
          packValue = packValue.split(' - ')[0].trim();
        }

        return {
          ...p,
          id: p._id || p.id,
          name: productName,
          imageUrl: p.mainImage || p.imageUrl || p.mainImageUrl,
          mrp: p.mrp || p.compareAtPrice || p.price,
          pack: packValue,
          variations: p.variations || [],
          weightVariants: p.weightVariants || [],
          sellingUnit: p.sellingUnit || 'unit',
          isAvailable: p.isAvailable !== undefined ? p.isAvailable : true
        };
      });
      setProducts(mappedProducts);
    } else {
      const fetchDiscountedProducts = async () => {
        try {
          const response = await getProducts({ limit: 50 });
          if (response.success && response.data) {
            const mappedProducts = (response.data as any[]).map(p => {
              let productName = p.productName || p.name || '';
              productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();

              let packValue = p.pack || p.variations?.[0]?.title || p.variations?.[0]?.value || 'Standard';
              if (packValue && packValue.includes(' - ')) {
                packValue = packValue.split(' - ')[0].trim();
              }

              return {
                ...p,
                id: p._id || p.id,
                name: productName,
                imageUrl: p.mainImage || p.imageUrl || p.mainImageUrl,
                mrp: p.mrp || p.compareAtPrice || p.price,
                pack: packValue,
                variations: p.variations || [],
                weightVariants: p.weightVariants || [],
                sellingUnit: p.sellingUnit || 'unit',
                isAvailable: p.isAvailable !== undefined ? p.isAvailable : true
              };
            });
            setProducts(mappedProducts);
          }
        } catch (err) {
          console.error("Failed to fetch products for LowestPricesEver", err);
        }
      };
      fetchDiscountedProducts();
    }
  }, [adminProducts]);

  const getFilteredProducts = () => {
    if (adminProducts && adminProducts.length > 0) {
      return products.slice(0, 20);
    }
    let filtered = products;
    if (activeTab !== 'all') {
      if (activeTab === 'grocery') {
        filtered = products.filter((p) =>
          ['snacks', 'atta-rice', 'dairy-breakfast', 'masala-oil', 'biscuits-bakery', 'cold-drinks', 'fruits-veg'].includes(p.categoryId)
        );
      } else {
        filtered = products.filter((p) => p.categoryId === activeTab);
      }
    }
    return filtered
      .filter((product) => {
        if (!product.mrp) return false;
        const disc = Math.round(((product.mrp - product.price) / product.mrp) * 100);
        return disc > 0;
      })
      .slice(0, 10);
  };

  const discountedProducts = getFilteredProducts();

  const { addToCart, updateQuantity } = useCart();

  const handleAddToCart = useCallback((product: Product, element?: HTMLElement | null) => {
    addToCart(product, element);
  }, [addToCart]);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number, variantId?: string, variantTitle?: string) => {
    updateQuantity(productId, quantity, variantId, variantTitle);
  }, [updateQuantity]);

  const handleShowVariants = useCallback((product: Product) => {
    setSelectedProductForVariants(product);
    setIsVariantModalOpen(true);
  }, []);

  return (
    <div
      className="relative"
      style={{
        background: `linear-gradient(to bottom, ${theme.primary[3]}, ${theme.primary[3]}, ${theme.secondary[1]}, ${theme.secondary[2]})`,
        marginTop: '0px',
        paddingTop: '12px',
        paddingBottom: '16px',
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: '30px', zIndex: 10, opacity: 0.95 }}>
        <svg viewBox="0 0 1200 30" preserveAspectRatio="none" className="w-full h-full" style={{ display: 'block' }}>
          <path
            d="M0,30 L0,15 Q25,0 50,15 T100,15 T150,15 T200,15 T250,15 T300,15 T350,15 T400,15 T450,15 T500,15 T550,15 T600,15 T650,15 T700,15 T750,15 T800,15 T850,15 T900,15 T950,15 T1000,15 T1050,15 T1100,15 T1150,15 L1200,15 L1200,30 Z"
            fill="white"
            stroke="white"
            strokeWidth="0"
          />
        </svg>
      </div>

      <div className="px-4 relative z-10" style={{ marginTop: '30px', marginBottom: '12px' }} data-section="lowest-prices">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="flex-1 h-px bg-neutral-300"></div>
          <h2
            className="font-black text-center whitespace-nowrap"
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontSize: '28px',
              color: '#000000',
              opacity: fontLoaded ? 1 : 0,
              transition: 'opacity 0.2s ease-in',
              textShadow:
                '-1.5px -1.5px 0 white, 1.5px -1.5px 0 white, -1.5px 1.5px 0 white, 1.5px 1.5px 0 white, ' +
                '-1.5px 0px 0 white, 1.5px 0px 0 white, 0px -1.5px 0 white, 0px 1.5px 0 white, 3px 3px 4px rgba(0, 0, 0, 0.5)',
              letterSpacing: '0.8px',
              fontWeight: 900,
              lineHeight: '1.1',
              transform: 'perspective(500px) rotateX(2deg) rotateY(-1deg)',
            } as React.CSSProperties}
          >
            LOWEST PRICES EVER
          </h2>
          <div className="flex-1 h-px bg-neutral-300"></div>
        </div>
      </div>

      <div className="px-4 pb-4 flex justify-center relative z-10">
        <img src="/assets/TAG-line.png" alt="Mandi Bazaar Tagline" className="w-full max-w-[180px] md:max-w-xs object-contain" style={{ opacity: 0.9 }} />
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {discountedProducts.map((product) => {
          const cartQuantity = cartItemsMap.get(product.id) || 0;
          return (
            <ProductCard
              key={product.id}
              product={product}
              cartQuantity={cartQuantity}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              onShowVariants={handleShowVariants}
            />
          );
        })}
      </div>

      {selectedProductForVariants && (
        <VariantSelectorModal
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
          product={selectedProductForVariants}
        />
      )}
    </div>
  );
}

