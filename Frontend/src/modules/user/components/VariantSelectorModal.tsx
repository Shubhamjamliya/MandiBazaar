import React, { useState } from 'react';
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

  const isWeightMode = (product as any).sellingUnit === 'weight';
  const variants = isWeightMode
    ? ((product as any).weightVariants || []).filter((v: any) => v.isEnabled)
    : (product.variations || []);

  const [selectedVariant, setSelectedVariant] = useState<any>(variants[0] || null);

  if (!isOpen) return null;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

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
      const productWithVariant = {
        ...product,
        price: selectedVariant.discPrice || selectedVariant.price,
        mrp: selectedVariant.price,
        pack: selectedVariant.title || selectedVariant.value || product.pack,
        selectedVariant: selectedVariant,
        variantId: typeof selectedVariant._id === 'object' ? selectedVariant._id.$oid : selectedVariant._id,
        variantTitle: selectedVariant.title || selectedVariant.value,
      };
      await addToCart(productWithVariant);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0 p-1">
                  <img
                    src={product.imageUrl || product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">{product.name || product.productName}</h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Select an option to add</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Variants List */}
            <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-2.5">
                {variants.map((v: any, idx: number) => {
                  const variantId = isWeightMode
                    ? `wv_${v.label}`
                    : (typeof v._id === 'object' ? v._id.$oid : v._id);

                  const isSelected = isWeightMode
                    ? selectedVariant?.label === v.label
                    : (typeof selectedVariant?._id === 'object' ? selectedVariant?._id.$oid : selectedVariant?._id) === variantId;

                  const price = isWeightMode ? v.price : (v.discPrice || v.price);
                  const mrp = isWeightMode ? (v.mrp || v.price) : v.price;
                  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

                  return (
                    <button
                      key={variantId || idx}
                      onClick={() => setSelectedVariant(v)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${isSelected
                          ? 'border-green-600 bg-green-50/50 shadow-sm'
                          : 'border-neutral-100 bg-white hover:border-neutral-200'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'border-green-600 bg-green-600' : 'border-neutral-300'
                          }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white transition-transform duration-200 scale-110" />}
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-bold ${isSelected ? 'text-green-900' : 'text-neutral-800'}`}>
                            {isWeightMode ? v.label : (v.title || v.value)}
                          </p>
                          {discount > 0 && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-100/50 px-1.5 py-0.5 rounded ml-0">{discount}% OFF</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-neutral-900">₹{price}</p>
                        {discount > 0 && (
                          <p className="text-[10px] text-neutral-400 line-through font-medium">₹{mrp}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-white border-t border-neutral-100 sm:rounded-b-3xl">
              <Button
                onClick={handleAddToCart}
                disabled={!selectedVariant}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="uppercase tracking-wide text-xs">Add to Cart</span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span className="text-sm">₹{isWeightMode ? selectedVariant?.price : (selectedVariant?.discPrice || selectedVariant?.price)}</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VariantSelectorModal;
