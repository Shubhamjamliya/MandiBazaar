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

export default function ServiceCategoriesSection({
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
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 py-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">
            Popular Categories
          </h2>
        </div>
        <button
          onClick={() => navigate('/categories')}
          className="text-xs text-green-600 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-full hover:bg-green-50 transition-colors shadow-sm"
        >
          View All
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Horizontal Scrolling Categories */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4 pb-2">
          {/* Permanent Home Category */}
          <motion.div
            key="home-permanent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
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
            <div className={`w-16 h-16 rounded-full shadow-md hover:shadow-lg transition-all overflow-hidden border-2 ${!activeCategoryId ? "border-green-600 ring-2 ring-green-100" : "border-green-100"
              }`}>
              <img
                src="/assets/Home-icon.png"
                alt="Home"
                className="w-full h-full object-cover"
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

          {categories.map((category) => {
            const isSelected = activeCategoryId === (category.categoryId || category.id || category.slug);
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 flex flex-col items-center cursor-pointer"
                onClick={() => handleCategoryClick(category)}
                style={{ width: "70px" }}
              >
                {/* Circular Image Container */}
                <div className={`w-16 h-16 bg-white rounded-full shadow-md hover:shadow-lg transition-all overflow-hidden flex items-center justify-center border-2 ${isSelected ? "border-green-600 ring-2 ring-green-100" : "border-green-100"
                  }`}>
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover rounded-full"
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
}
