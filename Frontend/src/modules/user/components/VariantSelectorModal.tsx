import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../../../types/domain';
import { useCart } from '../../../context/CartContext';
import Button from '../../../components/ui/button';
import { getVariantStyle } from '../../../utils/variantStyleUtils';

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
  const [isAdding, setIsAdding] = useState(false);

  // Helper to extract a stable ID string from a variant
  const getVariantId = (v: any) => {
    if (!v) return '';
    if (isWeightMode) return `wv_${v.label}`;
    const id = v._id || v.id;
    if (!id) return `${v.title || v.value}_${v.price}`;
    return typeof id === 'object' ? (id.$oid || String(id)) : String(id);
  };

  // Reset selection when modal opens or product ID changes
  // We use a stable ID comparison to prevent jumps during cart updates
  useEffect(() => {
    if (isOpen && variants.length > 0) {
      if (isWeightMode) {
        const defaultVariant = variants.find((v: any) => v.isDefault);
        setSelectedVariant(defaultVariant || variants[0]);
      } else {
        setSelectedVariant(variants[0]);
      }
    }
  }, [isOpen, product.id, (product as any)._id]);

  if (!isOpen) return null;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedVariant || isAdding) return;

    setIsAdding(true);
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
    } finally {
      setIsAdding(false);
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
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            layout
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[400px] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-neutral-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 pt-1 border-b border-neutral-100 flex items-start justify-between relative">
              <div className="flex gap-4 items-center">
                <div className="w-[60px] h-[75px] bg-white rounded-lg overflow-hidden flex-shrink-0 border border-neutral-100 flex items-center justify-center p-1">
                  <img
                    src={product.imageUrl || product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image';
                    }}
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-neutral-900 leading-tight">
                    {product.name || product.productName}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-[#119c49] font-bold text-[11px]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z"/>
                    </svg>
                    Premium Quality
                  </div>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1.5">
                    {variants.length} OPTIONS AVAILABLE
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="w-8 h-8 flex items-center justify-center bg-white shadow-sm border border-neutral-100 rounded-full text-neutral-500 hover:text-neutral-900 absolute right-5 top-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Variants List */}
            <div className="px-5 py-3 overflow-y-auto scrollbar-hide space-y-2.5 flex-1 min-h-[30vh]">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#119c49]">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p className="text-[11px] font-bold text-neutral-800 uppercase tracking-widest">
                  Choose Pack Size
                </p>
              </div>

              {variants.map((v: any, idx: number) => {
                const variantId = getVariantId(v);
                const isSelected = getVariantId(selectedVariant) === variantId;

                const price = isWeightMode ? v.price : (v.discPrice || v.price);
                
                // Generating subtitle based on index
                const getSubtitleInfo = (index: number) => {
                  if (index === 0) return { text: "Best value pack", icon: true, iconColor: "text-[#119c49]" };
                  if (index === 1) return { text: "Great for small families", icon: false };
                  if (index === 2) return { text: "Perfect for trying out", icon: false };
                  return { text: "Pocket friendly", icon: false };
                };
                
                const subtitle = getSubtitleInfo(idx);

                return (
                  <motion.button
                    key={variantId || idx}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariant(v);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${isSelected
                      ? 'border-[#119c49] bg-green-50/30'
                      : 'border-neutral-100 bg-white hover:border-neutral-200'
                      }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isSelected ? 'border-[#119c49]' : 'border-neutral-300'
                        }`}>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#119c49]" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className={`inline-block px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-tight mb-0.5 ${getVariantStyle(isWeightMode ? v.label : (v.title || v.value)).bg} ${getVariantStyle(isWeightMode ? v.label : (v.title || v.value)).text}`}>
                          {isWeightMode ? v.label : (v.title || v.value)}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {subtitle.icon && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={subtitle.iconColor}>
                              <path d="M24 24H0V0h24v24z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                          <span className={`text-[11px] ${isSelected && idx === 0 ? 'text-[#119c49] font-medium' : 'text-neutral-500'}`}>
                            {subtitle.text}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[15px] font-bold tracking-tight text-neutral-900`}>
                        ₹{price}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer Action */}
            <div className="px-5 py-4 bg-white border-t border-neutral-50 rounded-b-3xl space-y-3">
              {/* Summary Box */}
              <div className="bg-green-50/50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#119c49]">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-neutral-500 font-medium leading-none mb-1">You are adding</p>
                  <p className="text-sm font-bold text-neutral-900 leading-none">
                    {product.name || product.productName} ({isWeightMode ? selectedVariant?.label : (selectedVariant?.title || selectedVariant?.value)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#119c49]">
                    ₹{isWeightMode ? selectedVariant?.price : (selectedVariant?.discPrice || selectedVariant?.price)}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => handleAddToCart(e)}
                disabled={!selectedVariant || isAdding}
                className="w-full bg-[#119c49] hover:bg-green-700 disabled:bg-neutral-100 disabled:text-neutral-400 text-white h-[48px] rounded-xl font-bold flex items-center justify-between px-5 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span className="uppercase tracking-widest text-[12px]">
                    {isAdding ? 'Adding...' : 'Add to cart'}
                  </span>
                </div>
                {!isAdding && (
                  <div className="flex items-center gap-3">
                    <div className="w-px h-5 bg-white/30" />
                    <span className="text-base font-bold tracking-tight">₹{isWeightMode ? selectedVariant?.price : (selectedVariant?.discPrice || selectedVariant?.price)}</span>
                  </div>
                )}
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
