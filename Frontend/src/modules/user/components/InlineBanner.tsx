import { useState, useEffect, useRef } from "react";

interface InlineBannerProps {
  banners?: Array<{
    id?: string;
    image: string;
    link?: string;
  }>;
  images?: string[];
  autoPlayInterval?: number;
}

export default function InlineBanner({ banners, images, autoPlayInterval = 8000 }: InlineBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Default fallback images
  const defaultImages = [
    { image: "/banners/first.png" },
    { image: "/banners/second.png" },
    { image: "/banners/third.png" }
  ];

  let displayBanners: Array<{ image: string; link?: string }> = [];

  if (banners && banners.length > 0) {
    displayBanners = banners;
  } else if (images && images.length > 0) {
    displayBanners = images.map(img => ({ image: img }));
  } else {
    displayBanners = defaultImages;
  }

  // Auto-scroll logic
  useEffect(() => {
    if (displayBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % displayBanners.length;

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
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [displayBanners.length, autoPlayInterval]);

  if (!displayBanners || displayBanners.length === 0) return null;

  return (
    <div className="px-4 my-1 bg-gradient-to-b from-white to-[#f0fdf4]">
      {/* Horizontal Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayBanners.map((banner, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full snap-center"
            onClick={() => {
              if (banner.link) {
                window.location.href = banner.link;
              }
            }}
          >
            <div className={`relative rounded-2xl overflow-hidden shadow-sm border border-green-100 aspect-[16/7] w-full ${banner.link ? 'cursor-pointer' : ''}`}>
              <img
                src={banner.image}
                alt={`Banner ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
