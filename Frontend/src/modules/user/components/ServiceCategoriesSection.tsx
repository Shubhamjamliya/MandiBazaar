import React, { memo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface ServiceCategory {
  id: string;
  name: string;
  image?: string;
  categoryId?: string;
  slug?: string;
}

interface ServiceCategoriesSectionProps {
  categories: ServiceCategory[];
  activeCategoryId?: string | null;
  onCategorySelect?: (category: ServiceCategory) => void;
}

// Wrap export in memo
const ServiceCategoriesSectionMemo = memo(function ServiceCategoriesSection({
  categories,
  activeCategoryId,
  onCategorySelect,
}: ServiceCategoriesSectionProps) {
  const navigate = useNavigate();

  const handleCategoryClick = (category: ServiceCategory) => {
    if (onCategorySelect) {
      onCategorySelect(category);
    } else {
      if (category.categoryId) {
        navigate(`/category/${category.categoryId}`);
      } else if (category.slug) {
        navigate(`/category/${category.slug}`);
      }
    }
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 py-1.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-4">
        <div>
          <h2 className="text-sm font-black text-emerald-900/80 uppercase tracking-tight">
            Popular Categories
          </h2>
        </div>
        <button
          onClick={() => navigate('/categories')}
          className="text-[10px] text-emerald-600 font-bold bg-white/60 px-2.5 py-1 rounded-lg hover:bg-white transition-colors border border-emerald-100/50"
        >
          View All
        </button>
      </div>

      {/* Horizontal Scrolling Categories */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4 pb-1">
          {/* Permanent Home Category */}
          <motion.div
            key="home-permanent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -3, 0]
            }}
            transition={{
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
              y: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 flex flex-col items-center cursor-pointer"
            onClick={() => {
              if (onCategorySelect) {
                onCategorySelect({ id: 'home-redirect', name: 'Home' });
              } else {
                navigate('/');
              }
            }}
            style={{ width: "70px" }}
          >
            {/* Circular Image Container for Home */}
            <div className={`w-16 h-16 rounded-full shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 ${!activeCategoryId ? "border-green-600 ring-2 ring-green-100" : "border-green-100"
              }`}>
              <img
                src="/assets/Home-icon.png"
                alt="Home"
                className="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110"
              />
            </div>

            {/* Category Name */}
            <div className="mt-1 text-center w-full">
              <span className={`text-[10px] font-medium line-clamp-2 leading-tight ${!activeCategoryId ? "text-green-700 font-bold" : "text-gray-700"
                }`}>
                Home
              </span>
            </div>
          </motion.div>

          {categories.map((category, index) => {
            const isSelected = activeCategoryId === (category.categoryId || category.id || category.slug);
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -3, 0]
                }}
                transition={{
                  opacity: { duration: 0.2, delay: index * 0.05 },
                  scale: { duration: 0.2, delay: index * 0.05 },
                  y: {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.2 // Staggered floating effect
                  }
                }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 flex flex-col items-center cursor-pointer"
                onClick={() => handleCategoryClick(category)}
                style={{ width: "70px" }}
              >
                {/* Circular Image Container */}
                <div className={`w-16 h-16 bg-white rounded-full shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex items-center justify-center border-2 ${isSelected ? "border-green-600 ring-2 ring-green-100" : "border-green-100"
                  }`}>
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover rounded-full transform transition-transform duration-500 hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="text-2xl text-green-600 font-bold">${category.name.charAt(0)}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="text-2xl text-green-600 font-bold">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Category Name */}
                <div className="mt-1 text-center w-full">
                  <span className={`text-[10px] font-medium line-clamp-2 leading-tight ${isSelected ? "text-green-700 font-bold" : "text-gray-700"
                    }`}>
                    {category.name}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>


      {/* Custom scrollbar hide */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
});

export default ServiceCategoriesSectionMemo;
