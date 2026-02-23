import { useState, useEffect, useRef } from "react";

interface InlineBannerProps {
  images: string[];
  autoPlayInterval?: number;
}

export default function InlineBanner({ images, autoPlayInterval = 8000 }: InlineBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Default fallback images if none provided
  const defaultImages = [
    "/banners/first.png",
    "/banners/second.png",
    "/banners/third.png"
  ];

  const displayImages = images && images.length > 0 ? images : defaultImages;

  // Auto-scroll every 8 seconds
  useEffect(() => {
    if (displayImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % displayImages.length;
        
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
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [displayImages.length, autoPlayInterval]);

  if (!displayImages || displayImages.length === 0) return null;

  return (
    <div className="px-4 my-4">
      {/* Horizontal Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayImages.map((image, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full snap-center"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-green-100" style={{ height: "170px" }}>
              <img
                src={image}
                alt={`Banner ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Scroll Indicator Dots */}
      {displayImages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {displayImages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index === currentIndex ? 'bg-green-600' : 'bg-green-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
