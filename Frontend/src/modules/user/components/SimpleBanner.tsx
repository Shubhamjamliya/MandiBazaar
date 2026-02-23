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
    <div className="px-4 pt-5 pb-4 bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Horizontal Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayBanners.map((banner, index) => (
          <div
            key={banner.id || index}
            className="flex-shrink-0 w-full snap-center"
          >
            <div
              className="relative rounded-2xl overflow-hidden shadow-md border border-green-100 cursor-pointer"
              style={{ height: "170px" }}
              onClick={() => {
                if (banner.link) {
                  window.location.href = banner.link.startsWith('http') ? banner.link : banner.link;
                  // If using react-router-dom navigate
                  // navigate(banner.link);
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
                  <div className="text-center text-white p-6">
                    <h2 className="text-xl font-bold mb-2">
                      {banner.title || "Special Offer"}
                    </h2>
                    <p className="text-sm mb-3 opacity-90">Check out our latest deals</p>
                    <button className="bg-white text-orange-600 px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors shadow-lg">
                      SHOP NOW
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Scroll Indicator Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {displayBanners.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${index === currentIndex ? 'bg-green-600' : 'bg-green-300'
              }`}
          />
        ))}
      </div>
    </div>
  );
}
