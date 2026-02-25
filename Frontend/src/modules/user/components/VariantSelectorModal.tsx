import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../../../types/domain';
import { useCart } from '../../../context/CartContext';
import Button from '../../../components/ui/button';

interface VariantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({ isOpen, onClose, product }) => {
  const { addToCart } = useCart();

  // Determine if we are in weight-based mode (Vegetables/Fruits)
  const isWeightMode = (product as any).sellingUnit === 'weight';

  // Get active variants based on mode
  const variants = useMemo(() => {
    if (isWeightMode) {
      return ((product as any).weightVariants || []).filter((v: any) => v.isEnabled);
    }
    return product.variations || [];
  }, [product, isWeightMode]);

  // Handle selected variant state
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // Helper to extract a stable ID string from a variant
  const getVariantId = (v: any) => {
    if (!v) return '';
    if (isWeightMode) return `wv_${v.label}`;
    const id = v._id || v.id;
    if (!id) return `${v.title || v.value}_${v.price}`;
    return typeof id === 'object' ? (id.$oid || String(id)) : String(id);
  };

  // Reset selection when product changes or modal opens
  useEffect(() => {
    if (isOpen && variants.length > 0) {
      setSelectedVariant(variants[0]);
    }
  }, [product, isOpen, variants]);

  if (!isOpen) return null;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedVariant) return;

    try {
      if (isWeightMode) {
        const productWithWeight = {
          ...product,
          price: selectedVariant.price,
          mrp: selectedVariant.mrp || selectedVariant.price,
          pack: selectedVariant.label,
          variantTitle: selectedVariant.label,
          variantId: `wv_${selectedVariant.label}`,
          selectedWeightVariant: selectedVariant,
        };
        await addToCart(productWithWeight);
      } else {
        const variantTitle = selectedVariant.title || selectedVariant.value || product.pack;
        const productWithVariant = {
          ...product,
          price: selectedVariant.discPrice || selectedVariant.price,
          mrp: selectedVariant.price,
          pack: variantTitle,
          selectedVariant: selectedVariant,
          variantId: getVariantId(selectedVariant),
          variantTitle: variantTitle,
        };
        await addToCart(productWithVariant);
      }
      onClose();
    } catch (error) {
      console.error("Failed to add variant to cart", error);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            layout
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[440px] bg-white rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Mobile Grab Handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>

            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <div className="w-14 h-14 bg-neutral-50 rounded-2xl overflow-hidden flex-shrink-0 p-1.5 border border-neutral-100">
                  <img
                    src={product.imageUrl || product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-neutral-900 line-clamp-1">
                    {product.name || product.productName}
                  </h3>
                  <p className="text-[11px] text-green-600 font-bold uppercase tracking-wider">
                    {variants.length} Options Available
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="w-9 h-9 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 rounded-full transition-all text-neutral-400 hover:text-neutral-900 active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Variants List */}
            <div className="px-5 py-6 max-h-[50vh] overflow-y-auto scrollbar-hide space-y-3">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.1em] mb-4 text-left">
                Choose Pack Size
              </p>

              {variants.map((v: any, idx: number) => {
                const variantId = getVariantId(v);
                const isSelected = getVariantId(selectedVariant) === variantId;

                const price = isWeightMode ? v.price : (v.discPrice || v.price);
                const mrp = isWeightMode ? (v.mrp || v.price) : v.price;
                const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

                return (
                  <motion.button
                    key={variantId || idx}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariant(v);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 group ${isSelected
                      ? 'border-green-600 bg-green-50/40 shadow-sm ring-1 ring-green-600/20'
                      : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50/50'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'border-green-600 bg-green-600 shadow-md shadow-green-100' : 'border-neutral-200 bg-white group-hover:border-neutral-300'
                        }`}>
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-white"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-green-900' : 'text-neutral-800'}`}>
                          {isWeightMode ? v.label : (v.title || v.value)}
                        </p>
                        {discount > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-extrabold text-white bg-green-600 px-1.5 py-0.5 rounded-[4px] leading-none uppercase tracking-tighter">
                              {discount}% OFF
                            </span>
                            <span className="text-[10px] text-neutral-400 line-through font-medium">₹{mrp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[15px] font-black tracking-tight ${isSelected ? 'text-green-700' : 'text-neutral-900'}`}>
                        ₹{price}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer Action */}
            <div className="px-5 py-5 bg-white border-t border-neutral-50 sm:rounded-b-[28px]">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => handleAddToCart(e)}
                disabled={!selectedVariant}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-neutral-100 disabled:text-neutral-400 text-white h-[52px] rounded-2xl font-black flex items-center justify-between px-6 shadow-xl shadow-green-200/50 transition-all disabled:shadow-none"
              >
                <span className="uppercase tracking-widest text-[11px]">Add to cart</span>
                <div className="flex items-center gap-2">
                  <div className="w-px h-4 bg-white/20" />
                  <span className="text-base">₹{isWeightMode ? selectedVariant?.price : (selectedVariant?.discPrice || selectedVariant?.price)}</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default VariantSelectorModal;
