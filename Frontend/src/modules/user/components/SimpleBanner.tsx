import { useState, useEffect, useRef } from "react";

interface BannerProps {
  banners?: Array<{
    id: string;
    image: string;
    title?: string;
    link?: string;
  }>;
}

export default function SimpleBanner({ banners }: BannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use banners from props or fallback to defaults
  const displayBanners = banners && banners.length > 0 ? banners : [
    {
      id: "1",
      image: "https://img.freepik.com/free-vector/horizontal-banner-template-grocery-sales_23-2149432421.jpg",
      title: "Welcome to Mandi Bazaar",
    },
    {
      id: "2",
      image: "https://img.freepik.com/free-vector/flat-supermarket-social-media-cover-template_23-2149363385.jpg",
      title: "Special Offers",
    },
  ];

  // Auto-scroll every 8 seconds
  useEffect(() => {
    if (displayBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % displayBanners.length;

        // Scroll to next banner
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const bannerWidth = container.offsetWidth;
          container.scrollTo({
            left: bannerWidth * nextIndex,
            behavior: 'smooth'
          });
        }

        return nextIndex;
      });
    }, 8000); // 8 seconds

    return () => clearInterval(interval);
  }, [displayBanners.length]);

  return (
    <div className="pb-4 bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Horizontal Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayBanners.map((banner, index) => (
          <div
            key={banner.id || index}
            className="flex-shrink-0 w-full snap-center"
          >
            <div
              className="relative overflow-hidden cursor-pointer"
              style={{ height: "220px" }}
              onClick={() => {
                if (banner.link) {
                  window.location.href = banner.link;
                }
              }}
            >
              {banner.image ? (
                <img
                  src={banner.image}
                  alt={banner.title || "Banner"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-r ${(banner as any).bgColor || "from-orange-400 to-orange-500"
                    } flex items-center justify-center`}
                >
                  <div className="text-center text-white p-8">
                    <h2 className="text-2xl font-black mb-2 tracking-tight">
                      {banner.title || "Special Offer"}
                    </h2>
                    <p className="text-base mb-4 opacity-90 font-medium">Check out our latest deals</p>
                    <button className="bg-white text-orange-600 px-8 py-3 rounded-full text-sm font-black hover:bg-gray-50 transition-all shadow-xl active:scale-95">
                      SHOP NOW
                    </button>
                  </div>
                </div>
              )}
              {/* Subtle Overlay Gradient for better depth */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      {/* Scroll Indicator Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {displayBanners.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-6 bg-emerald-600' : 'w-1.5 bg-emerald-200'
              }`}
          />
        ))}
      </div>
    </div>
  );
}
