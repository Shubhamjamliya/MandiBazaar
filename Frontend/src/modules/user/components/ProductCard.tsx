import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import React, { useRef, useEffect, useState, memo } from 'react';
import { Product } from '../../../types/domain';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from '../../../hooks/useLocation';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/button';
import Badge from '../../../components/ui/badge';
import StarRating from '../../../components/ui/StarRating';
import { calculateProductPrice } from '../../../utils/priceUtils';
import { useWishlist } from '../../../hooks/useWishlist';
import VariantSelectorModal from './VariantSelectorModal';
import { getVariantStyle } from '../../../utils/variantStyleUtils';

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  badgeText?: string;
  showPackBadge?: boolean;
  showStockInfo?: boolean;
  showHeartIcon?: boolean;
  showRating?: boolean;
  showVegetarianIcon?: boolean;
  showOptionsText?: boolean;
  optionsCount?: number;
  compact?: boolean;
  categoryStyle?: boolean; // Kept for prop compatibility but layout is now unified
}

function ProductCard({
  product,
  showBadge = false,
  badgeText,
  showPackBadge = false,
  showStockInfo = false,
  showHeartIcon = false,
  showRating = false,
  showVegetarianIcon = false,
  showOptionsText = false,
  optionsCount = 2,
  compact = false,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity } = useCart();
  const { location } = useLocation();
  const { showToast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  // Use the optimized useWishlist hook
  const { isWishlisted, toggleWishlist } = useWishlist(((product as any).id || product._id) as string);

  // Single ref to track any cart operation in progress for this product
  const isOperationPendingRef = useRef(false);

  // Get Price and MRP using utility
  let { displayPrice, mrp, discount } = calculateProductPrice(product);

  // Fallback for weight-mode products where top-level price may be 0
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

  // Find the cart item for this specific product and variation
  const cartItem = cart.items.find((item) => {
    const itemProductId = item.product.id || item.product._id;
    const productId = (product as any).id || product._id;
    if (itemProductId !== productId) return false;

    if (actingVariantId || actingVariantTitle) {
      const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
      const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;
      return itemVariantId === actingVariantId || itemVariantTitle === actingVariantTitle;
    }
    return true;
  });

  const inCartQty = cartItem?.quantity || 0;

  if (isWeightMode && actingWeightVariant) {
    const vPrice = Number(actingWeightVariant.price) || 0;
    const vMrp = Number(actingWeightVariant.mrp) || Number(product.mrp) || Number(product.compareAtPrice) || vPrice;

    if (vPrice > 0) {
      displayPrice = vPrice;
      mrp = vMrp;
      // Recalculate discount for the acting weight variant
      if (mrp > displayPrice) {
        discount = Math.round(((mrp - displayPrice) / mrp) * 100);
      } else {
        discount = 0;
      }
    }
  }
  const weightPackLabel = isWeightMode && actingWeightVariant ? actingWeightVariant.label : '';

  const handleCardClick = () => {
    navigate(`/product/${((product as any).id || product._id) as string}`);
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (product.isAvailable === false) return;
    if (isOperationPendingRef.current) return;

    const variationsCount = (product.variations?.length || 0);
    const weightVariantsCount = ((product as any).weightVariants || []).filter((v: any) => v.isEnabled).length;

    if (variationsCount > 1 || weightVariantsCount > 1) {
      setIsVariantModalOpen(true);
      return;
    }

    isOperationPendingRef.current = true;
    try {
      if (isWeightMode && actingWeightVariant) {
        const productWithWeight = {
          ...product,
          price: actingWeightVariant.price,
          mrp: actingWeightVariant.mrp || actingWeightVariant.price,
          pack: actingWeightVariant.label,
          variantTitle: actingWeightVariant.label,
          variantId: `wv_${actingWeightVariant.label}`,
          selectedWeightVariant: actingWeightVariant,
        };
        await addToCart(productWithWeight, addButtonRef.current);
      } else if (actingQuantityVariant) {
        const productWithVariant = {
          ...product,
          price: actingQuantityVariant.discPrice || actingQuantityVariant.price,
          mrp: actingQuantityVariant.price,
          pack: actingQuantityVariant.title || actingQuantityVariant.value || product.pack,
          selectedVariant: actingQuantityVariant,
          variantId: actingQuantityVariant._id,
          variantTitle: actingQuantityVariant.title || actingQuantityVariant.value,
        };
        await addToCart(productWithVariant, addButtonRef.current);
      } else {
        await addToCart(product, addButtonRef.current);
      }
    } finally {
      isOperationPendingRef.current = false;
    }
  };

  const handleDecrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOperationPendingRef.current || inCartQty <= 0) return;
    isOperationPendingRef.current = true;
    try {
      await updateQuantity(
        ((product as any).id || product._id) as string,
        inCartQty - 1,
        actingVariantId,
        actingVariantTitle
      );
    } finally {
      isOperationPendingRef.current = false;
    }
  };

  const handleIncrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (product.isAvailable === false) return;
    if (isOperationPendingRef.current) return;
    isOperationPendingRef.current = true;
    try {
      if (inCartQty > 0) {
        await updateQuantity(
          ((product as any).id || product._id) as string,
          inCartQty + 1,
          actingVariantId,
          actingVariantTitle
        );
      } else {
        await handleAdd(e);
      }
    } finally {
      isOperationPendingRef.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="bg-green-50 rounded-lg shadow-sm overflow-hidden flex flex-col relative h-full border border-neutral-100/50"
    >
      <div
        onClick={handleCardClick}
        className="cursor-pointer flex-1 flex flex-col"
      >
        {/* Product Image Stack */}
        <div className={`w-full ${compact ? 'h-32 md:h-40' : 'h-28 md:h-36'} bg-neutral-100 flex items-center justify-center overflow-hidden relative`}>
          {product.imageUrl || product.mainImage ? (
            <img
              ref={imageRef}
              src={product.imageUrl || product.mainImage}
              alt={product.name || product.productName || 'Product'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-4xl fallback-icon';
                  fallback.textContent = (product.name || product.productName || '?').charAt(0).toUpperCase();
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-4xl font-bold">
              {(product.name || product.productName || '?').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Discount Badge */}
          {showBadge && discount > 0 && (
            <div className="absolute top-2 left-2 z-10 bg-green-600 text-white text-[12px] font-bold px-2 py-0.5 rounded shadow-sm">
              {discount}% off
            </div>
          )}

          {/* Wishlist Heart */}
          {showHeartIcon && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(e);
              }}
              className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-sm group/heart"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "#ef4444" : "none"}
                xmlns="http://www.w3.org/2000/svg"
                className={`transition-colors ${isWishlisted ? "text-red-500" : "text-neutral-400 group-hover/heart:text-red-400"}`}
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
          )}

          {/* Options Badge */}
          {Math.max(product.variations?.length || 0, weightVariants.filter((v: any) => v.isEnabled).length) >= 2 && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="text-[9px] font-bold text-neutral-700 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border border-neutral-100">
                {Math.max(product.variations?.length || 0, weightVariants.filter((v: any) => v.isEnabled).length)} Options
              </span>
            </div>
          )}
        </div>

        {/* ADD Button Row (Style 1 Sequence) */}
        <div className="px-2.5 pt-1.5 pb-0">
          {inCartQty === 0 ? (
            <Button
              ref={addButtonRef}
              variant="outline"
              size="sm"
              disabled={product.isAvailable === false}
              onClick={(e) => {
                e.stopPropagation();
                handleAdd(e);
              }}
              className={`w-full border rounded-full font-bold text-[10px] h-7 px-3 flex items-center justify-center uppercase tracking-wide transition-all ${product.isAvailable === false
                ? 'border-neutral-200 text-neutral-400 bg-neutral-50 cursor-not-allowed'
                : 'border-green-600 text-green-600 bg-white hover:bg-green-50 shadow-sm'
                }`}
            >
              {product.isAvailable === false ? 'Out of Range' : 'ADD'}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 bg-white border border-green-600 rounded-full px-1.5 py-0.5 h-7 w-full shadow-sm">
              <Button
                variant="default"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecrease(e);
                }}
                className="w-5 h-5 p-0 bg-transparent text-green-600 hover:bg-green-50 shadow-none font-bold"
              >
                −
              </Button>
              <span className="text-[11px] font-black text-green-600 min-w-[1rem] text-center">
                {inCartQty}
              </span>
              <Button
                variant="default"
                size="icon"
                disabled={product.isAvailable === false}
                onClick={(e) => {
                  e.stopPropagation();
                  handleIncrease(e);
                }}
                className={`w-5 h-5 p-0 bg-transparent text-green-600 shadow-none font-bold ${product.isAvailable === false ? 'text-neutral-300' : 'hover:bg-green-50'
                  }`}
              >
                +
              </Button>
            </div>
          )}
        </div>

        {/* Product Info (Style 1 Sequence) */}
        <div className="px-2.5 pt-1.5 md:pt-2 pb-2 md:pb-3 flex-1 flex flex-col">
          {/* 1. Weight/Pack */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-tight ${getVariantStyle(weightPackLabel || (product.pack && product.pack !== "Standard" ? product.pack : (product.variations?.[0]?.value || product.variations?.[0]?.title)) || '1 piece').bg} ${getVariantStyle(weightPackLabel || (product.pack && product.pack !== "Standard" ? product.pack : (product.variations?.[0]?.value || product.variations?.[0]?.title)) || '1 piece').text} ${getVariantStyle(weightPackLabel || (product.pack && product.pack !== "Standard" ? product.pack : (product.variations?.[0]?.value || product.variations?.[0]?.title)) || '1 piece').border}`}>
              {weightPackLabel || (product.pack && product.pack !== "Standard" ? product.pack : (product.variations?.[0]?.value || product.variations?.[0]?.title)) || '1 piece'}
            </span>
          </div>

          {/* 2. Name */}
          <h3 className="text-[12px] font-bold text-neutral-900 mb-1 line-clamp-2 leading-tight min-h-[2rem] max-h-[2rem] overflow-hidden">
            {product.name || product.productName || ''}
          </h3>

          {/* 3. Rating & Delivery Row */}
          <div className="flex items-center justify-between mb-1 gap-1">
            <StarRating
              rating={(product.rating || (product as any).rating) || 0}
              reviewCount={(product.reviews || (product as any).reviewsCount) || 0}
              size="sm"
              showCount={true}
            />
            <div className="flex items-center gap-0.5 whitespace-nowrap">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-400">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-tighter">14 MINS</span>
            </div>
          </div>

          {/* 4. Pricing Row */}
          <div className="mt-auto flex items-baseline gap-1.5">
            <span className="text-[16px] md:text-[18px] font-black text-neutral-900 leading-none">
              ₹{displayPrice.toLocaleString('en-IN')}
            </span>
            {mrp && mrp > displayPrice && (
              <span className="text-[12px] text-neutral-400 line-through font-medium leading-none">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>

      <VariantSelectorModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        product={product}
      />
    </motion.div >
  );
}

export default memo(ProductCard);
