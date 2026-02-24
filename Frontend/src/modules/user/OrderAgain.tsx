import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../../hooks/useOrders';
import { useCart } from '../../context/CartContext';
import { getProducts } from '../../services/api/customerProductService';
import WishlistButton from '../../components/WishlistButton';
import { calculateProductPrice } from '../../utils/priceUtils';
import { useLocation } from '../../hooks/useLocation';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'bg-green-100 text-green-700';
    case 'On the way':
      return 'bg-blue-100 text-blue-700';
    case 'Accepted':
      return 'bg-yellow-100 text-yellow-700';
    case 'Received':
      return 'bg-neutral-100 text-neutral-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
};

export default function OrderAgain() {
  const { orders, loading: ordersLoading } = useOrders();
  const { cart, addToCart, updateQuantity } = useCart();
  const { location } = useLocation();
  const navigate = useNavigate();
  const [addedOrders, setAddedOrders] = useState<Set<string>>(new Set());
  const [bestsellersLoading, setBestsellersLoading] = useState(true);
  const [bestsellerProducts, setBestsellerProducts] = useState<any[]>([]);

  // Handle "Order Again" - Add all items from an order to cart
  const handleOrderAgain = async (order: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Mark this order as added
    setAddedOrders(prev => new Set(prev).add(order.id));

    // Process each item from the order
    for (const item of (order.items || [])) {
      if (!item.product) continue;

      const productObj = item.product;
      const actingVariantId = item.variant; // Use the variant ID stored in the order
      const actingVariantTitle = item.variantTitle;

      // Find if this exact product+variant is already in cart
      const existingCartItem = cart.items.find(cartItem => {
        const itemProductId = cartItem.product.id || cartItem.product._id;
        const productId = productObj.id || productObj._id;
        if (itemProductId !== productId) return false;

        const cartVariantId = (cartItem.product as any).variantId || (cartItem.product as any).selectedVariant?._id;
        const cartVariantTitle = (cartItem.product as any).variantTitle || (cartItem.product as any).pack;
        return cartVariantId === actingVariantId || cartVariantTitle === actingVariantTitle;
      });

      if (existingCartItem) {
        await updateQuantity(
          (productObj.id || productObj._id),
          existingCartItem.quantity + (item.quantity || 1),
          actingVariantId,
          actingVariantTitle
        );
      } else {
        // Prepare product for cart with its variant info
        const productForCart = {
          ...productObj,
          variantId: actingVariantId,
          variantTitle: actingVariantTitle,
          price: item.price,
          pack: actingVariantTitle || productObj.pack
        };
        await addToCart(productForCart);

        // If they ordered more than 1 of this item, update quantity
        if (item.quantity > 1) {
          await updateQuantity(
            (productObj.id || productObj._id),
            item.quantity,
            actingVariantId,
            actingVariantTitle
          );
        }
      }
    }
  };

  useEffect(() => {
    const fetchBestsellers = async () => {
      setBestsellersLoading(true);
      try {
        const response = await getProducts({
          sort: 'popular',
          limit: 12,
          latitude: location?.latitude,
          longitude: location?.longitude
        });
        if (response.success && response.data) {
          const mapped = (response.data as any[]).map(p => ({
            ...p,
            id: p._id || p.id,
            name: (p.productName || p.name || '').replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim(),
            imageUrl: p.mainImage || p.imageUrl,
            mrp: p.mrp || p.price,
            pack: p.pack || p.variations?.[0]?.title || p.smallDescription || 'Standard'
          }));
          setBestsellerProducts(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch bestsellers:', error);
      } finally {
        setBestsellersLoading(false);
      }
    };
    fetchBestsellers();
  }, [location?.latitude, location?.longitude]);

  const hasOrders = orders && orders.length > 0;
  const pageLoading = ordersLoading && bestsellerProducts.length === 0;

  // Memoize the entire internal content to prevent "jank" during multiple state updates
  const content = useMemo(() => {
    if (pageLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-neutral-500 font-medium">Loading your favorites...</p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {/* Orders Section */}
        {hasOrders && (
          <div className="px-4 mt-2 mb-2">
            <h2 className="text-sm font-semibold text-neutral-900 mb-2">Your Previous Orders</h2>
            <div className="space-y-1.5">
              {orders.map((order) => {
                const shortId = order.id.toString().split('-').slice(-1)[0];
                const previewItems = (order.items || []).slice(0, 3);

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="bg-white rounded-lg border border-neutral-200 p-2 hover:shadow-sm transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="text-xs font-semibold text-neutral-900 truncate max-w-[100px]">
                            Order #{shortId}
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 mb-1">{formatDate(order.createdAt)}</div>
                        <div className="flex items-center gap-1">
                          {previewItems.filter(item => item?.product).map((item, idx) => (
                            <div key={idx} className="w-6 h-6 bg-neutral-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border border-neutral-200" style={{ marginLeft: idx > 0 ? '-4px' : '0' }}>
                              <img src={item.product.imageUrl || (item.product as any).image} alt="" className="w-full h-full object-contain" />
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-6 h-6 bg-neutral-200 rounded flex items-center justify-center text-[8px] font-medium text-neutral-600 border border-neutral-200 ml-[-4px]">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="text-xs font-bold text-neutral-900">₹{order.totalAmount.toFixed(0)}</div>
                        <div className="text-[10px] text-neutral-500">{order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}</div>
                        <button
                          onClick={(e) => handleOrderAgain(order, e)}
                          disabled={addedOrders.has(order.id)}
                          className={`mt-1 text-[10px] font-semibold px-3 py-1 rounded-md transition-colors shadow-sm ${addedOrders.has(order.id)
                            ? 'bg-orange-100 text-orange-600 border border-orange-200'
                            : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                          {addedOrders.has(order.id) ? 'Added!' : 'Order Again'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bestsellers Section */}
        {bestsellerProducts.length > 0 && (
          <div className="bg-white/95 backdrop-blur-sm py-5 mb-4 rounded-2xl mx-2 shadow-sm border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3 px-4">Don't forget these</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-4">
              {bestsellerProducts.map((product) => {
                const { displayPrice, mrp, discount, hasDiscount } = calculateProductPrice(product);
                // Variant-aware cart item check
                const cartItem = cart.items.find(item => {
                  const itemId = item.product.id || item.product._id;
                  const productId = product.id || product._id;
                  if (itemId !== productId) return false;
                  // For bestsellers carousel, we often target the first available variation
                  const firstVarId = product.variations?.[0]?._id;
                  const itemVarId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
                  return !firstVarId || itemVarId === firstVarId;
                });
                const inCartQty = cartItem?.quantity || 0;

                return (
                  <div key={product.id} className="flex-shrink-0 w-[140px]">
                    <div className="bg-white rounded-xl overflow-hidden flex flex-col relative h-full border border-neutral-100/50 shadow-sm">
                      <div onClick={() => navigate(`/product/${product.id}`)} className="relative block cursor-pointer">
                        <div className="w-full h-28 bg-neutral-50 flex items-center justify-center overflow-hidden">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                          {discount > 0 && (
                            <div className="absolute top-1.5 left-1.5 z-10 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{discount}% OFF</div>
                          )}
                          <WishlistButton productId={product.id} size="sm" className="top-1.5 right-1.5" />
                          <div className="absolute bottom-1.5 right-1.5 z-10">
                            <AnimatePresence mode="wait">
                              {inCartQty === 0 ? (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    addToCart(product, e.currentTarget);
                                  }}
                                  className="bg-white text-green-600 border border-green-600 text-[10px] font-bold px-2.5 py-1 rounded shadow-md"
                                >ADD</button>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-green-600 rounded px-1.5 py-1 shadow-md" onClick={e => e.stopPropagation()}>
                                  <button onClick={e => { e.stopPropagation(); updateQuantity(product.id, inCartQty - 1); }} className="text-white font-black text-sm">−</button>
                                  <span className="text-white font-bold text-xs">{inCartQty}</span>
                                  <button onClick={e => { e.stopPropagation(); updateQuantity(product.id, inCartQty + 1); }} className="text-white font-black text-sm">+</button>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-white flex-1 flex flex-col">
                        <h3 className="text-[10px] font-bold text-neutral-900 line-clamp-2 leading-tight mb-1">{product.name}</h3>
                        <div className="text-[8px] text-neutral-500 font-medium mb-1 uppercase">15 MINS • {product.pack}</div>
                        <div className="flex items-baseline gap-1 mt-auto">
                          <span className="text-xs font-bold text-neutral-900">₹{displayPrice}</span>
                          {hasDiscount && <span className="text-[9px] text-neutral-400 line-through">₹{mrp}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasOrders && !bestsellersLoading && (
          <div className="py-10 px-4 flex flex-col items-center">
            <div className="w-40 h-40 bg-yellow-50 rounded-full flex items-center justify-center mb-6 border border-yellow-100">
              <span className="text-4xl text-yellow-600">🛍️</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Reordering made easy</h2>
            <p className="text-sm text-neutral-500 text-center max-w-xs">Once you order something, it will show up here so you can buy it again in one tap.</p>
            <button onClick={() => navigate('/')} className="mt-6 px-8 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-sm shadow-lg hover:bg-emerald-700 transition-all">Start Shopping</button>
          </div>
        )}
      </motion.div>
    );
  }, [pageLoading, bestsellerProducts, orders, addedOrders, cart.items, bestsellersLoading]);

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <div className="h-[180px]"></div>
      {content}
    </div>
  );
}

