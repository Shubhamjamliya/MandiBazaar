import { useState } from 'react';
import { useLocation } from '../hooks/useLocation';

interface LocationBannerProps {
  showDismissButton?: boolean;
  onClickBanner?: () => void;
}

export default function LocationBanner({ showDismissButton = true, onClickBanner }: LocationBannerProps) {
  const { isLocationEnabled, locationPermissionStatus } = useLocation();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if:
  // 1. Location is already enabled
  // 2. Banner is dismissed
  if (isLocationEnabled || isDismissed) {
    return null;
  }

  const handleBannerClick = () => {
    if (onClickBanner) {
      onClickBanner();
    }
  };

  return (
    <div
      onClick={handleBannerClick}
      className="fixed top-0 left-0 w-full z-[9999] bg-orange-50 border-b border-orange-300 px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-orange-100 transition-colors shadow-lg"
      style={{ boxShadow: '0 2px 8px rgba(255, 140, 0, 0.08)' }}
    >
      <div className="flex items-center gap-3 flex-1">
        <svg
          className="w-5 h-5 text-orange-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm text-orange-800 font-medium">
          Enable location to see nearby vendors.
        </p>
      </div>

      {showDismissButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="text-orange-600 hover:text-orange-700 flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
