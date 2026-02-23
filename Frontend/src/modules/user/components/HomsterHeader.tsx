import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../../hooks/useLocation';

export default function HomsterHeader() {
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();

  const locationDisplayText = userLocation?.address || 
    (userLocation?.city && userLocation?.state ? `${userLocation.city}, ${userLocation.state}` : '') ||
    userLocation?.city || '';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-green-100">
      {/* Top Section - Logo, Name, Location */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left - Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img 
                src="/assets/logo/logo.png" 
                alt="Mandi Bazaar" 
                className="h-11 w-11 object-contain"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Mandi Bazaar
              </h1>
              <p className="text-[10px] text-green-600 font-medium">Fresh & Fast</p>
            </div>
          </div>

          {/* Right - Location */}
          <button 
            onClick={() => navigate('/location')}
            className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 hover:bg-green-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-left max-w-[100px]">
              <div className="text-[10px] text-gray-500 leading-tight">Deliver to</div>
              <div className="text-xs font-bold text-gray-900 truncate leading-tight">
                {locationDisplayText ? locationDisplayText.split(',')[0] : 'Select Location'}
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div
          onClick={() => navigate('/search')}
          className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="#6b7280" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-gray-500 flex-1">Search for vegetables, fruits...</span>
          <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-md">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 11H5M5 11L12 18M5 11L12 4" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-bold text-green-700">⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
