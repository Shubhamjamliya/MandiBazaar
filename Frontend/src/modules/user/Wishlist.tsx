import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ProductCard from './components/ProductCard';
import { getWishlist, removeFromWishlist } from '../../services/api/customerWishlistService';
import { Product } from '../../types/domain';
import { useCart } from '../../context/CartContext';
import { useLocation } from '../../hooks/useLocation';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateProductPrice } from '../../utils/priceUtils';

export default function Wishlist() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await getWishlist({
        latitude: location?.latitude,
        longitude: location?.longitude
      });
      if (res.success && res.data) {
        setProducts(res.data.products.map(p => ({
          ...p,
          id: p._id || (p as any).id,
          name: p.productName || (p as any).name,
          imageUrl: p.mainImageUrl || p.mainImage || (p as any).imageUrl,
          price: (p as any).price || (p as any).variations?.[0]?.price || 0,
          pack: (p as any).pack || (p as any).variations?.[0]?.name || 'Standard'
        })) as any);
      }
    } catch (error: any) {
      console.error('Failed to fetch wishlist:', error);
      showToast(error.message || 'Failed to fetch wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [location?.latitude, location?.longitude]);

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      setProducts(products.filter(p => (p.id !== productId && p._id !== productId)));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  return (
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      <div className="px-4 py-4 bg-white border-b border-neutral-200 mb-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-xl font-bold text-neutral-900">My Wishlist</h1>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryStyle={true}
                showHeartIcon={true}
                showBadge={true}
                showStockInfo={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-500">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Your wishlist is empty</h2>
            <p className="text-sm mb-6">Explore more and shortlist some items</p>
            <Button onClick={() => navigate('/')} className="bg-green-600 text-white rounded-full px-8">
              Start Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
