import { useNavigate } from "react-router-dom";
import ProductCard from "./ProductCard";
import { calculateProductPrice } from "../../../utils/priceUtils";
import { useCart } from "../../../context/CartContext";

interface RawProduct {
  _id?: string;
  id?: string;
  productName?: string;
  name?: string;
  mainImage?: string;
  imageUrl?: string;
  mainImageUrl?: string;
  pack?: string;
  variations?: { title?: string; value?: string }[];
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

function normalizeProduct(p: RawProduct, categoryObj: any) {
  return {
    ...p,
    id: p._id || p.id || "",
    name: (p.productName || p.name || "")
      .replace(
        /\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i,
        ""
      )
      .trim(),
    imageUrl: p.imageUrl || p.mainImage || p.mainImageUrl || "",
    // Ensure we don't end up with an empty pack if info exists elsewhere
    pack: p.pack || p.variations?.[0]?.title || p.variations?.[0]?.value || p.smallDescription || "",
    category: categoryObj,
    categoryId: categoryObj._id || categoryObj.id || p.categoryId,
  };
}

export default function CategoryProductSlider({ category }: CategoryProductSliderProps) {
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity } = useCart();

  const categoryId = category.id || category._id || "";

  // Collect products from subcategories with their specific subcategory info
  const subcatProducts = (category.subcategories || []).flatMap(
    (sub) => (sub.products || []).map((p) => normalizeProduct(p, sub))
  );

  // Also collect any direct-category products (no subcategory)
  const directProducts = (category.products || []).map((p) => normalizeProduct(p, category));

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

      {/* Vertical Grid Display */}
      <div className="px-2 md:px-4 pb-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as any}
              showHeartIcon={false}
              showStockInfo={false}
              showBadge={true}
              showOptionsText={true}
              categoryStyle={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
