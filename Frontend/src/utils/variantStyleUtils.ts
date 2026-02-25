
/**
 * Utility to provide consistent color coding for different product weight/quantity variants.
 * This helps users visually distinguish between different pack sizes.
 */

export interface VariantStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const getVariantStyle = (label: string = ''): VariantStyle => {
  const l = label.toLowerCase().trim();

  // 1kg / 1 unit
  if (l.includes('1kg') || l === '1 kg' || l.includes('1 l') || l.includes('1l')) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      dot: 'bg-emerald-500'
    };
  }

  // 500g / 500ml
  if (l.includes('500g') || l.includes('500 g') || l.includes('500ml') || l.includes('500 ml')) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      dot: 'bg-amber-500'
    };
  }

  // 250g / 250ml
  if (l.includes('250g') || l.includes('250 g') || l.includes('250ml') || l.includes('250 ml')) {
    return {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-100',
      dot: 'bg-sky-500'
    };
  }

  // 100g / 100ml
  if (l.includes('100g') || l.includes('100 g') || l.includes('100ml') || l.includes('100 ml')) {
    return {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-100',
      dot: 'bg-indigo-500'
    };
  }

  // Large packs (2kg, 5kg, etc)
  if (l.includes('2kg') || l.includes('2 kg') || l.includes('5kg') || l.includes('5 kg') || l.includes('10kg')) {
    return {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-100',
      dot: 'bg-rose-500'
    };
  }

  // Small single items
  if (l.includes('piece') || l.includes('unit') || l.includes('pack of 1')) {
    return {
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-100',
      dot: 'bg-violet-500'
    };
  }

  // Default
  return {
    bg: 'bg-neutral-50',
    text: 'text-neutral-600',
    border: 'border-neutral-100',
    dot: 'bg-neutral-400'
  };
};
