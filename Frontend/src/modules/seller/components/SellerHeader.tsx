import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

interface SellerHeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export default function SellerHeader({ onMenuClick, isSidebarOpen }: SellerHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const { user, logout } = useAuth();
  const settingsRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname.includes(path);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/seller/login');
  };

  const handleSettingsClick = () => {
    setShowSettingsDropdown(!showSettingsDropdown);
    setShowLocationDropdown(false);
  };

  const handleLocationClick = () => {
    setShowLocationDropdown(!showLocationDropdown);
    setShowSettingsDropdown(false);
  };

  const handleLogoClick = () => {
    navigate('/seller');
  };

  return (
    <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3 h-full">
        {/* Logo and Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Hamburger Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 6H20M4 12H20M4 18H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Mandi Bazaar Logo */}
          <button
            onClick={handleLogoClick}
            className="hover:opacity-80 transition-opacity flex items-center"
          >
            <img
              src="/assets/logo/logo.png"
              alt="Mandi Bazaar"
              className="h-7 sm:h-9 md:h-11 w-auto object-contain cursor-pointer"
            />
          </button>

          <h1 className="text-[13px] sm:text-base font-bold text-neutral-800 ml-0.5 whitespace-nowrap">Seller Panel</h1>
        </div>

        {/* Navigation Tabs - Desktop Only */}
        <div className="hidden lg:flex items-center gap-4 lg:gap-6 flex-1 justify-center px-4">
          <button
            onClick={() => navigate('/seller/orders')}
            className={`relative px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${isActive('/seller/orders') ? 'text-neutral-900 border-b-2 border-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
              }`}
          >
            Orders
          </button>
          <button
            onClick={() => navigate('/seller/return-order')}
            className={`px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${isActive('/seller/return-order') ? 'text-neutral-900 border-b-2 border-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
              }`}
          >
            Return Order
          </button>
          <button
            onClick={() => navigate('/seller/wallet')}
            className={`px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${isActive('/seller/wallet') ? 'text-neutral-900 border-b-2 border-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
              }`}
          >
            Wallet
          </button>
        </div>

        {/* Location - Right aligned */}
        <div className="flex items-center justify-end flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 rounded-full border border-teal-100 max-w-[120px] sm:max-w-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 flex-shrink-0">
              <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-[10px] sm:text-xs font-bold text-teal-700 truncate">
              {user?.city || user?.storeLocation || 'Location'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
