import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, memo } from 'react';
import { useLocation } from '../../../hooks/useLocation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const ATTR_PHRASES = [
  "Mandi Bazaar",
  "Fresh from Farm",
  "Quality Grocery",
  "Lowest Prices",
  "Fast Delivery",
  "Happy Shopping!"
];

const SlidingPhrases = memo(() => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % ATTR_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-6 overflow-hidden">
      {ATTR_PHRASES.map((phrase, idx) => (
        <h1
          key={phrase}
          className={`absolute inset-0 text-xl font-black bg-gradient-to-r from-emerald-900 to-emerald-800 bg-clip-text text-transparent leading-tight tracking-tight text-slide-up whitespace-nowrap transition-all duration-700 ${idx === phraseIndex
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
            }`}
        >
          {phrase}
        </h1>
      ))}
    </div>
  );
});

function HomsterHeader() {
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();

  const locationDisplayText = userLocation?.address ||
    (userLocation?.city && userLocation?.state ? `${userLocation.city}, ${userLocation.state}` : '') ||
    userLocation?.city || '';

  return (
    <>
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out forwards;
        }
        .glass-header {
          background: rgba(240, 253, 244, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .text-slide-up {
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes run-across {
          0% { left: -100px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        .animate-run-across {
          position: absolute;
          top: -40px;
          animation: run-across 4s linear infinite;
        }
      `}</style>

      <div className="fixed top-0 left-0 right-0 z-50 glass-header shadow-md border-b border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-white">
        {/* ULTRA-FRONT FAST DELIVERY ANIMATION - Using Local Shopping Cart (Temporarily Commented Out) */}
        {/* <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50 overflow-hidden">
          <div className="animate-run-across flex items-center h-full">
            <div className="w-48 h-24">
              <DotLottieReact
                src="/assets/animations/shopping-cart-1.json"
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div> */}

        {/* Top Section - Logo & Name */}
        <div className="px-4 pt-3 pb-1 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-fade-in-down relative">
              <div className="relative group animate-bounce-slow">
                <div className="absolute inset-0 bg-emerald-200/40 rounded-full blur-md group-hover:bg-emerald-300/50 transition-all"></div>
                <div className="relative h-11 w-11 bg-white rounded-xl shadow-sm flex items-center justify-center border border-emerald-100 p-1">
                  <img
                    src="/assets/logo/logo.png"
                    alt="Mandi Bazaar"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>

              {/* Brand Section */}
              <div className="flex flex-col justify-center min-w-[150px] relative z-10 ml-1">
                <SlidingPhrases />
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest opacity-80">Fresh & Fast</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Row and Cart Animation */}
        <div className="px-4 pb-0 flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => navigate('/location')}
              className="flex items-center gap-2 w-full bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors py-1.5 px-3 rounded-xl border border-emerald-50/50 group overflow-hidden"
            >
              <div className="flex-shrink-0 text-emerald-600 group-hover:scale-110 transition-transform">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 truncate text-left min-w-0">
                <span className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-tight mr-1 whitespace-nowrap">Deliver to</span>
                <span className="text-[11px] font-semibold text-emerald-950 truncate block">
                  {locationDisplayText || 'Select location'}
                </span>
              </div>
            </button>
          </div>

          {/* Clickable Vegetable Cart Animation - Super Tall Hero spanning to Search Bar */}
          <div className="flex-shrink-0 animate-fade-in-down self-center relative z-20" style={{ animationDelay: '0.15s' }}>
            <button
              onClick={() => navigate('/cart')}
              className="relative group transition-transform active:scale-95 flex items-center justify-center -top-10"
            >
              <div className="absolute inset-0 bg-emerald-100/30 rounded-full blur-3xl group-hover:bg-emerald-200/50 transition-all scale-150"></div>
              <div className="w-32 h-48 relative z-10 -mt-12 -mb-24 -mr-6 -ml-4">
                <DotLottieReact
                  src="/assets/animations/vegetable.json"
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Search Bar - Full Width below */}
        <div className="px-4 pb-2 animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
          <div
            onClick={() => navigate('/search')}
            className="w-full bg-neutral-100/80 rounded-2xl px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-neutral-200/60 transition-all border border-emerald-500/30 group shadow-sm overflow-hidden"
          >
            <div className="flex-shrink-0 text-neutral-500 group-hover:text-emerald-600 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-sm text-neutral-500 font-medium truncate">
              Search fresh vegetables...
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

const HomsterHeaderMemo = memo(HomsterHeader);
export default HomsterHeaderMemo;
