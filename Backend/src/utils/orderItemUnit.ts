/**
 * Resolve the human-readable pack/weight label (e.g. "500 g", "1 kg") for an order item.
 * `item.variation` may hold a weight variant key ("wv_<label>"), a variation _id, or a variation value.
 * Pass the populated product to resolve ids to labels; returns 'N/A' when nothing can be resolved.
 */
export const resolveOrderItemUnit = (item: any, product?: any): string => {
  const variation = item?.variation ? String(item.variation) : '';
  let unit = variation.startsWith('wv_') ? variation.replace('wv_', '') : (variation || 'N/A');

  if (!product || typeof product !== 'object') return unit;

  // Weight variants
  if (product.sellingUnit === 'weight' && Array.isArray(product.weightVariants)) {
    const match = product.weightVariants.find((v: any) => v.label === unit);
    if (match) return match.label;
  }

  // Quantity variations
  if (Array.isArray(product.variations) && product.variations.length > 0) {
    if (variation) {
      const byIdOrValue = product.variations.find((v: any) =>
        (v._id && v._id.toString() === variation) || v.value === variation
      );
      if (byIdOrValue) return byIdOrValue.value;
    }

    // Recover from price when the stored variation can't be matched
    const byPrice = product.variations.find((v: any) => v.price === item.unitPrice || v.discPrice === item.unitPrice);
    if (byPrice) return byPrice.value;
    if (product.variations.length === 1) return product.variations[0].value;
  }

  // Simple product: fall back to its pack/unit description
  if (unit === 'N/A') {
    return product.pack || 'N/A';
  }

  return unit;
};
