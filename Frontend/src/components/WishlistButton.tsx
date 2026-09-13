import { useWishlist } from '../hooks/useWishlist';

interface WishlistButtonProps {
  productId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'absolute' | 'relative';
}

export default function WishlistButton({
  productId,
  className = '',
  size = 'md',
  position = 'absolute'
}: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useWishlist(productId);

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: '16',
    md: '20',
    lg: '24'
  };

  // Only add default positioning if className doesn't already specify it
  const hasPositioning = className.includes('top-') || className.includes('right-') || className.includes('left-') || className.includes('bottom-');
  const positionClasses = position === 'absolute' && !hasPositioning ? 'absolute top-2 right-2' : position === 'absolute' ? 'absolute' : '';
  const baseClasses = `${positionClasses} z-30 ${sizeClasses[size]} rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-md group/heart ${className}`;

  return null;
}

