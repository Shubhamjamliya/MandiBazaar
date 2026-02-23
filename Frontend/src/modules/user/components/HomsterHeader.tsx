import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../../hooks/useLocation';

export default function HomsterHeader() {
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();

  const locationDisplayText = userLocation?.address ||
    (userLocation?.city && userLocation?.state ? `${userLocation.city}, ${userLocation.state}` : '') ||
    userLocation?.city || '';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 via-green-600 to-green-700 shadow-md border-b border-green-500/30">
      {/* Top Section - Logo, Name, Location */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left - Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:bg-white/30 transition-all"></div>
              <img
                src="/assets/logo/logo.png"
                alt="Mandi Bazaar"
                className="h-12 w-12 object-contain relative drop-shadow-sm"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-emerald-600 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight tracking-tight">
                Mandi Bazaar
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                <p className="text-[11px] text-emerald-50 font-bold uppercase tracking-widest opacity-90">Fresh & Fast</p>
              </div>
            </div>
          </div>

          {/* Right - Location Button with Glassmorphism */}
          <button
            onClick={() => navigate('/location')}
            className="flex items-center gap-2 bg-white/15 backdrop-blur-lg px-3.5 py-2 rounded-2xl border border-white/20 hover:bg-white/25 transition-all active:scale-95 shadow-lg shadow-black/5"
          >
            <div className="p-1.5 bg-white/20 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-left max-w-[90px]">
              <div className="text-[10px] text-emerald-100/80 font-semibold leading-tight mb-0.5">Deliver to</div>
              <div className="text-xs font-black text-white truncate leading-tight">
                {locationDisplayText ? locationDisplayText.split(',')[0] : 'Select'}
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1">
              <path d="M6 9L12 15L18 9" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar - Modern & Floating */}
      <div className="px-4 pb-4">
        <div
          onClick={() => navigate('/search')}
          className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all border border-emerald-100 group"
        >
          <div className="bg-emerald-50 p-1.5 rounded-lg group-hover:bg-emerald-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="#059669" strokeWidth="2.5" />
              <path d="m21 21-4.35-4.35" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm text-gray-400 font-medium flex-1">Search for vegetables, fruits...</span>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 11H5M5 11L12 18M5 11L12 4" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-black text-emerald-700 uppercase">⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
