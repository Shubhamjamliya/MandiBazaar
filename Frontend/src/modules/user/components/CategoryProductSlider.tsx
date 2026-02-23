import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import WishlistButton from "../../../components/WishlistButton";
import { calculateProductPrice } from "../../../utils/priceUtils";
import { useCart } from "../../../context/CartContext";

interface RawProduct {
  _id?: string;
  id?: string;
  productName?: string;
  name?: string;
  mainImage?: string;
  imageUrl?: string;
  pack?: string;
  variations?: { title?: string }[];
  smallDescription?: string;
  [key: string]: any;
}

interface Category {
  id?: string;
  _id?: string;
  name: string;
  products?: RawProduct[];                         // direct category products
  subcategories?: { products?: RawProduct[] }[];   // subcategory products
}

interface CategoryProductSliderProps {
  category: Category;
}

function normalizeProduct(p: RawProduct, categoryId: string) {
  return {
    ...p,
    id: p._id || p.id || "",
    name: (p.productName || p.name || "")
      .replace(
        /\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i,
        ""
      )
      .trim(),
    imageUrl: p.mainImage || p.imageUrl || "",
    pack: p.pack || p.variations?.[0]?.title || p.smallDescription || "Standard",
    categoryId: p.categoryId || categoryId,
    price: p.price || 0,
    variations: p.variations?.map((v: any) => ({
      ...v,
      price: v.price || p.price || 0,
    })),
  };
}

export default function CategoryProductSlider({ category }: CategoryProductSliderProps) {
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity } = useCart();

  const categoryId = category.id || category._id || "";

  // Collect products from subcategories
  const subcatProducts = (category.subcategories || []).flatMap(
    (sub) => (sub.products || []).map((p) => normalizeProduct(p, categoryId))
  );

  // Also collect any direct-category products (no subcategory)
  const directProducts = (category.products || []).map((p) => normalizeProduct(p, categoryId));

  // Merge and deduplicate by id
  const seen = new Set<string>();
  const products = [...subcatProducts, ...directProducts].filter((p) => {
    if (!p.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  if (products.length === 0) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm py-5 mb-4 rounded-2xl mx-2 shadow-sm border-b border-neutral-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-sm font-semibold text-neutral-900 capitalize">
          {category.name}
        </h2>
        <button
          onClick={() => navigate(`/category/${categoryId}`)}
          className="text-[10px] font-bold text-green-600 hover:text-green-700 transition-colors bg-green-50 px-2.5 py-1 rounded-full"
        >
          VIEW ALL
        </button>
      </div>

      {/* Horizontal Scroll */}
      <div
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {products.map((product) => {
          const { displayPrice, mrp, discount, hasDiscount } =
            calculateProductPrice(product);
          const cartItem = cart.items.find(
            (item) =>
              item?.product &&
              (item.product.id === product.id ||
                item.product._id === product.id)
          );
          const inCartQty = cartItem?.quantity || 0;

          return (
            <div
              key={product.id}
              className="flex-shrink-0 w-[140px]"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="bg-white rounded-xl overflow-hidden flex flex-col relative h-full border border-neutral-100/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                {/* Image area */}
                <div
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative block cursor-pointer"
                >
                  <div className="w-full h-28 bg-neutral-50 flex items-center justify-center overflow-hidden relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-3xl">
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Discount Badge */}
                    {discount > 0 && (
                      <div className="absolute top-1.5 left-1.5 z-10 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        {discount}% OFF
                      </div>
                    )}

                    {/* Wishlist */}
                    <WishlistButton
                      productId={product.id}
                      size="sm"
                      className="top-1.5 right-1.5 shadow-sm"
                    />

                    {/* ADD / Stepper */}
                    <div className="absolute bottom-1.5 right-1.5 z-10">
                      <AnimatePresence mode="wait">
                        {inCartQty === 0 ? (
                          <motion.button
                            key="add-button"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addToCart(product, e.currentTarget);
                            }}
                            className="bg-white/95 backdrop-blur-sm text-green-600 border border-green-600 text-[10px] font-bold px-2.5 py-1 rounded shadow-md hover:bg-white transition-colors"
                          >
                            ADD
                          </motion.button>
                        ) : (
                          <motion.div
                            key="stepper"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1.5 bg-green-600 rounded px-1.5 py-1 shadow-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(product.id, inCartQty - 1);
                              }}
                              className="w-4 h-4 flex items-center justify-center text-white font-bold hover:bg-green-700 rounded transition-colors"
                            >
                              <span className="relative top-[-0.5px]">−</span>
                            </button>
                            <span className="text-white font-bold min-w-[0.75rem] text-center text-[12px]">
                              {inCartQty}
                            </span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(product.id, inCartQty + 1);
                              }}
                              className="w-4 h-4 flex items-center justify-center text-white font-bold hover:bg-green-700 rounded transition-colors"
                            >
                              <span className="relative top-[-0.5px]">+</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2 flex-1 flex flex-col bg-white">
                  <div
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="mb-1 cursor-pointer"
                  >
                    <h3 className="text-[10px] font-bold text-neutral-900 line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          width="7"
                          height="7"
                          viewBox="0 0 24 24"
                          fill={i < 4 ? "#fbbf24" : "#e5e7eb"}
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-[8px] text-neutral-500">(50+)</span>
                  </div>

                  {/* Delivery & Pack */}
                  <div className="flex items-center justify-between mt-auto mb-1">
                    <span className="text-[8px] text-neutral-500 font-medium uppercase">
                      15 MINS
                    </span>
                    <span className="text-[8px] text-neutral-500">
                      {product.pack}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-neutral-900">
                      ₹{displayPrice.toLocaleString("en-IN")}
                    </span>
                    {hasDiscount && (
                      <span className="text-[9px] text-neutral-400 line-through">
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
