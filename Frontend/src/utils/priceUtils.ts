import { Product } from '../types/domain';

export interface CalculatedPrice {
  displayPrice: number;
  mrp: number;
  discount: number;
  hasDiscount: boolean;
}

export const calculateProductPrice = (product: any, variationSelector?: number | string): CalculatedPrice => {
  if (!product) {
    return {
      displayPrice: 0,
      mrp: 0,
      discount: 0,
      hasDiscount: false
    };
  }

  let variation;
  let selectedWeightVariant;

  if (typeof variationSelector === 'number') {
    variation = product.variations?.[variationSelector];
  } else if (typeof variationSelector === 'string') {
    if (variationSelector.startsWith('wv_')) {
      const weightLabel = variationSelector.replace('wv_', '');
      selectedWeightVariant = product.weightVariants?.find((v: any) => v.label === weightLabel);
    } else {
      variation = product.variations?.find(
        (v: any) =>
          (v._id === variationSelector || v.id === variationSelector) ||
          v.value === variationSelector ||
          v.title === variationSelector ||
          v.pack === variationSelector
      );
    }
  }

  // Fallback to first variation if no specific one selected/found but variations exist
  // Only if variationSelector was NOT provided (undefined). If it was provided but not found, we probably shouldn't default to 0?
  // Current behavior was: if index undefined, use index 0.
  if (!variation && product.variations?.length > 0 && variationSelector === undefined) {
    variation = product.variations[0];
  }

  const displayPrice = (selectedWeightVariant?.price && selectedWeightVariant.price > 0)
    ? selectedWeightVariant.price
    : (variation?.discPrice && variation.discPrice > 0)
    ? variation.discPrice
    : (product.discPrice && product.discPrice > 0)
      ? product.discPrice
      : (variation?.price || product.price || 0);

  const mrp = selectedWeightVariant?.mrp || selectedWeightVariant?.price || variation?.price || product.mrp || product.compareAtPrice || product.price || 0;

  const hasDiscount = mrp > displayPrice;
  const discount = hasDiscount ? Math.round(((mrp - displayPrice) / mrp) * 100) : 0;

  return {
    displayPrice,
    mrp,
    discount,
    hasDiscount
  };
};
