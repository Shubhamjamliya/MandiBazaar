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

const parseTimeToMinutes = (timeValue: string) => {
  if (!/^\d{2}:\d{2}$/.test(timeValue)) return null;
  const [hourText, minuteText] = timeValue.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

const getIndiaTimeSnapshot = () => {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
  const timeParts = timeFormatter.formatToParts(now);
  const hour = Number(timeParts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(timeParts.find((part) => part.type === 'minute')?.value || 0);
  const day = new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(now);
  return { minutes: hour * 60 + minute, day };
};

const getShopStatus = (seller: any) => {
  if (seller?.isShopOpen === false) {
    return { isOpen: false, label: 'Closed by seller' };
  }

  const workingHours = seller?.workingHours;
  if (!workingHours?.open || !workingHours?.close) return null;

  const offDays = Array.isArray(workingHours.offDays) ? workingHours.offDays : [];
  const { minutes, day } = getIndiaTimeSnapshot();
  if (offDays.includes(day)) {
    return { isOpen: false, label: 'Closed today' };
  }

  const openMinutes = parseTimeToMinutes(workingHours.open);
  const closeMinutes = parseTimeToMinutes(workingHours.close);
  if (openMinutes === null || closeMinutes === null) return null;

  let isOpen = false;
  if (openMinutes < closeMinutes) {
    isOpen = minutes >= openMinutes && minutes < closeMinutes;
  } else if (openMinutes > closeMinutes) {
    isOpen = minutes >= openMinutes || minutes < closeMinutes;
  }

  return { isOpen, label: isOpen ? 'Open now' : 'Closed now' };
};

export default function OrderAgain() {
  const { orders, loading: ordersLoading } = useOrders();
  const { cart, addToCart, updateQuantity } = useCart();
  const { location } = useLocation();
  const navigate = useNavigate();
  const [addedOrders, setAddedOrders] = useState<Set<string>>(new Set());

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

  const hasOrders = orders && orders.length > 0;
  const pageLoading = ordersLoading;

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
          <div className="px-4 mt-0 mb-2">
            <h2 className="text-sm font-semibold text-neutral-900 mb-1.5">Your Previous Orders</h2>
            <div className="space-y-1.5">
              {orders.map((order) => {
                const shortId = order.id.toString().split('-').slice(-1)[0];
                const previewItems = (order.items || []).slice(0, 3);
                const firstItem = order.items?.[0];
                const firstProduct = firstItem?.product;
                const sellerInfo = firstProduct?.seller || (firstItem as any)?.seller || (order as any).seller;
                const shopStatus = getShopStatus(sellerInfo);
                const isShopClosed = shopStatus?.isOpen === false;
                const isButtonDisabled = addedOrders.has(order.id) || isShopClosed;

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
                        <div className="text-[10px] text-neutral-500">
                          {previewItems.map((item: any) => item?.product?.name).filter(Boolean).join(', ')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="text-xs font-bold text-neutral-900">₹{order.totalAmount.toFixed(0)}</div>
                        <div className="text-[10px] text-neutral-500">{order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}</div>
                        <button
                          onClick={(e) => {
                            if (isShopClosed) {
                              e.preventDefault();
                              e.stopPropagation();
                              alert("Seller is currently offline. Order cannot be placed.");
                              return;
                            }
                            handleOrderAgain(order, e);
                          }}
                          disabled={isButtonDisabled}
                          className={`mt-1 text-[10px] font-semibold px-3 py-1 rounded-md transition-colors shadow-sm ${addedOrders.has(order.id)
                            ? 'bg-orange-100 text-orange-600 border border-orange-200'
                            : isShopClosed
                              ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                          {addedOrders.has(order.id) ? 'Added!' : isShopClosed ? 'Shop Closed' : 'Order Again'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Empty State */}
        {!hasOrders && (
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
  }, [pageLoading, orders, addedOrders, cart.items]);

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <div className="h-[180px]"></div>
      {content}
    </div>
  );
}

