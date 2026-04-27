import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useLocation } from '../hooks/useLocation';
import { Cart, CartItem } from '../types/cart';
import { Product } from '../types/domain';
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart
} from '../services/api/customerCartService';
import { calculateProductPrice } from '../utils/priceUtils';

const CART_STORAGE_KEY = 'saved_cart';
const CART_META_STORAGE_KEY = 'saved_cart_meta';

type SavedCartMeta = {
  // If set, the cart belongs to an authenticated customer session
  ownerUserId: string | null;
};

interface AddToCartEvent {
  product: Product;
  sourcePosition?: { x: number; y: number };
}

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, sourceElement?: HTMLElement | null) => Promise<void>;
  removeFromCart: (productId: string, variantId?: string, variantTitle?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantId?: string, variantTitle?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: (latitude?: number, longitude?: number) => Promise<void>;
  lastAddEvent: AddToCartEvent | null;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Extended interface to include Cart Item ID
interface ExtendedCartItem extends CartItem {
  id?: string;
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage for persistence on refresh
  const [items, setItems] = useState<ExtendedCartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out items with null/undefined products (corrupted localStorage data)
        return Array.isArray(parsed) ? parsed.filter((item: any) => item?.product) : [];
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }
    return [];
  });
  const [savedCartMeta, setSavedCartMeta] = useState<SavedCartMeta>(() => {
    const raw = localStorage.getItem(CART_META_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ownerUserId: typeof parsed?.ownerUserId === 'string' ? parsed.ownerUserId : null,
        };
      } catch (e) {
        console.error("Failed to parse saved cart meta", e);
      }
    }
    return { ownerUserId: null };
  });
  const [lastAddEvent, setLastAddEvent] = useState<AddToCartEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingOperationsRef = useRef<Set<string>>(new Set());
  const hasSyncedGuestCartRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const { isAuthenticated, user } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast();

  // Helper to map API cart items to internal CartItem structure
  const mapApiItemsToState = (apiItems: any[]): ExtendedCartItem[] => {
    return apiItems
      .filter((item: any) => item.product) // Safety filter
      .map((item: any) => {
        // Robust quantity parsing to prevent "billion items" concatenation bug
        const qty = Math.max(parseInt(String(item.quantity || 0), 10) || 0, 0);
        return {
          id: item._id, // Store CartItem ID
          product: {
            id: item.product._id, // Map _id to id
            name: item.product.productName || item.product.name,
            price: Number(item.product.price) || 0,
            mrp: Number(item.product.mrp) || 0,
            discPrice: Number(item.product.discPrice) || 0,
            variations: item.product.variations,
            sellingUnit: item.product.sellingUnit,
            weightVariants: item.product.weightVariants,
            imageUrl: item.product.mainImage || item.product.imageUrl,
            pack: item.product.pack || '1 unit',
            categoryId: item.product.category || '',
            description: item.product.description,
            variantId: item.variation // Preserving variation ID/value
          },
          quantity: qty,
          variant: item.variation // Also preserve it here for order placement
        };
      });
  };

  // Sync to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Persist meta whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_META_STORAGE_KEY, JSON.stringify(savedCartMeta));
  }, [savedCartMeta]);

  // Helper to sync cart from API
  const fetchCart = async (lat?: number, lng?: number) => {
    // Debounce: prevent multiple fetches within 2 seconds
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000 && lat === undefined && lng === undefined) {
      setLoading(false);
      return;
    }
    lastFetchTimeRef.current = now;

    setLoading(true);
    if (!isAuthenticated || user?.userType !== 'Customer') {
      // Mark saved cart as "guest-owned" when logged out, so we can safely sync it once on next login.
      if (savedCartMeta.ownerUserId !== null) {
        setSavedCartMeta({ ownerUserId: null });
      }
      setLoading(false);
      return;
    }

    try {
      const queryLat = lat ?? location?.latitude;
      const queryLng = lng ?? location?.longitude;

      if (queryLat === undefined || queryLng === undefined) {
        setLoading(false);
        return;
      }

      // Only sync items that don't have a CartItem ID (meaning they are guest items not yet on the server)
      // Sync guest cart to backend if items exist in local state but not yet synced
      // Only do this on the first fetch after authentication in this session
      // IMPORTANT: Only sync if the saved cart is from a guest session.
      // Otherwise, refreshing while logged-in would re-add the same items and double quantities.
      const guestItems = items.filter(item => !item.id);
      const isGuestCart = savedCartMeta.ownerUserId === null;
      
      if (isGuestCart && guestItems.length > 0 && !hasSyncedGuestCartRef.current) {
        hasSyncedGuestCartRef.current = true; // Mark as synced
        let hasFailures = false;

        try {
          for (const item of guestItems) {
            const p = item.product;
            const productId = p?.id || p?._id;
            if (productId) {
              const variation = (p as any).variantId || item.variant || (p as any).selectedVariant?._id || (p as any).pack;
              try {
                if (queryLat === undefined || queryLng === undefined) {
                  continue;
                }
                // Robust quantity parsing for sync
                const qtyToSync = Math.max(parseInt(String(item.quantity || 1), 10) || 1, 1);
                await apiAddToCart(productId.toString(), qtyToSync, variation as string | undefined, queryLat, queryLng);
              } catch (itemError: any) {
                if (itemError.response?.status === 403) {
                  hasFailures = true;
                }
              }
            }
          }

          if (hasFailures) {
            showToast("Some items from your guest cart are not available in your current location and were removed.", "info");
          }
        } catch (syncError) {
          console.error("Critical error during guest cart sync:", syncError);
        }
      }

      const response = await getCart({
        latitude: queryLat,
        longitude: queryLng
      });
      if (response && response.data && response.data.items) {
        const hasLocation = queryLat !== undefined && queryLng !== undefined;
        if (response.data.items.length > 0 || hasLocation) {
          setItems(mapApiItemsToState(response.data.items));
        }
        // After a successful fetch as an authenticated customer, mark the saved cart as owned
        // so we never treat it as a guest cart on refresh.
        const currentUserId = (user as any)?.userId || (user as any)?.id || null;
        if (currentUserId && savedCartMeta.ownerUserId !== currentUserId) {
          setSavedCartMeta({ ownerUserId: currentUserId });
        }
        setEstimatedFee(response.data.estimatedDeliveryFee);
        setPlatformFee(response.data.platformFee);
        setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        setMinimumOrderValue(response.data.minimumOrderValue);
      } else if (queryLat !== undefined && queryLng !== undefined) {
        setItems([]);
        setEstimatedFee(undefined);
        setPlatformFee(undefined);
        setFreeDeliveryThreshold(undefined);
        setMinimumOrderValue(undefined);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      hasSyncedGuestCartRef.current = false;
      setLoading(false);
    }
  }, [isAuthenticated, (user as any)?.userId, (user as any)?.id, location?.latitude, location?.longitude]);

  // State for fees
  const [estimatedFee, setEstimatedFee] = useState<number | undefined>(undefined);
  const [platformFee, setPlatformFee] = useState<number | undefined>(undefined);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | undefined>(undefined);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number | undefined>(undefined);

  const cart: Cart = useMemo(() => {
    const validItems = items.filter(item => item?.product);
    const total = validItems.reduce((sum, item) => {
      const { displayPrice } = calculateProductPrice(item.product, item.variant);
      // Ensure numeric addition to prevent concatenation bug
      return Number(sum) + (Number(displayPrice) * (Number(item.quantity) || 0));
    }, 0);
    const itemCount = validItems.reduce((sum, item) => Number(sum) + (Number(item.quantity) || 0), 0);
    return {
      items: validItems,
      total: Number(total.toFixed(2)),
      itemCount: Number(itemCount),
      estimatedDeliveryFee: estimatedFee,
      platformFee,
      freeDeliveryThreshold,
      minimumOrderValue
    };
  }, [items, estimatedFee, platformFee, freeDeliveryThreshold, minimumOrderValue]);

  const addToCart = async (product: Product, sourceElement?: HTMLElement | null) => {
    const productId = product._id || product.id;
    if (pendingOperationsRef.current.has(productId)) {
      return;
    }
    pendingOperationsRef.current.add(productId);

    const normalizedProduct: Product = {
      ...product,
      id: productId,
      name: product.name || product.productName || 'Product',
      imageUrl: product.imageUrl || product.mainImage,
    };

    let sourcePosition: { x: number; y: number } | undefined;
    if (sourceElement) {
      const rect = sourceElement.getBoundingClientRect();
      sourcePosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    setLastAddEvent({ product: normalizedProduct, sourcePosition });
    setTimeout(() => setLastAddEvent(null), 800);

    const previousItems = [...items];
    setItems((prevItems) => {
      const validItems = prevItems.filter(item => item?.product);
      const variantId = (product as any).variantId || (product as any).selectedVariant?._id;
      const variantTitle = (product as any).variantTitle || (product as any).pack;

      const existingItemIndex = validItems.findIndex((item) => {
        const itemProductId = item.product.id || item.product._id;
        const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;

        if (variantId || variantTitle) {
          return itemProductId === productId &&
            (itemVariantId === variantId || itemVariantTitle === variantTitle);
        }
        return itemProductId === productId && !itemVariantId && !itemVariantTitle;
      });

      if (existingItemIndex > -1) {
        const newItems = [...validItems];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: Number(newItems[existingItemIndex].quantity || 0) + 1
        };
        return newItems;
      }
      return [...validItems, { product: normalizedProduct, quantity: 1 }];
    });

    if (isAuthenticated && user?.userType === 'Customer') {
      try {
        const variation = (product as any).variantId || (product as any).selectedVariant?._id || (product as any).variantTitle || (product as any).pack;
        const response = await apiAddToCart(
          productId,
          1,
          variation,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
          setMinimumOrderValue(response.data.minimumOrderValue);
        }
      } catch (error: any) {
        showToast(error.response?.data?.message || "Failed to add to cart", 'error');
        setItems(previousItems);
      } finally {
        pendingOperationsRef.current.delete(productId);
      }
    } else {
      pendingOperationsRef.current.delete(productId);
    }
  };

  const removeFromCart = async (productId: string, variantId?: string, variantTitle?: string) => {
    const operationKey = variantId ? `${productId}-${variantId}` : (variantTitle ? `${productId}-${variantTitle}` : productId);
    if (pendingOperationsRef.current.has(operationKey)) {
      return;
    }
    pendingOperationsRef.current.add(operationKey);

    const itemToRemove = items.find(item => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      if (itemProductId !== productId) return false;

      if (variantId || variantTitle) {
        const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;
        return itemVariantId === variantId || itemVariantTitle === variantTitle || item.variant === variantId;
      }

      return true;
    });
    const previousItems = [...items];
    setItems((prevItems) => prevItems.filter((item) => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      if (itemProductId !== productId) return true;

      if (variantId || variantTitle) {
        const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;
        return !(itemVariantId === variantId || itemVariantTitle === variantTitle || item.variant === variantId);
      }

      return false;
    }));

    if (isAuthenticated && user?.userType === 'Customer' && itemToRemove?.id) {
      try {
        const response = await apiRemoveFromCart(
          itemToRemove.id,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
          setMinimumOrderValue(response.data.minimumOrderValue);
        }
      } catch (error) {
        console.error("Remove from cart failed", error);
        setItems(previousItems);
      } finally {
        pendingOperationsRef.current.delete(operationKey);
      }
    } else {
      pendingOperationsRef.current.delete(operationKey);
    }
  };

  const updateQuantity = async (productId: string, quantity: number, variantId?: string, variantTitle?: string) => {
    const sanitizedQty = Math.max(parseInt(String(quantity), 10) || 0, 0);

    if (sanitizedQty <= 0) {
      removeFromCart(productId, variantId, variantTitle);
      return;
    }

    const operationKey = variantId ? `${productId}-${variantId}` : (variantTitle ? `${productId}-${variantTitle}` : productId);
    if (pendingOperationsRef.current.has(operationKey)) {
      return;
    }
    pendingOperationsRef.current.add(operationKey);

    const itemToUpdate = items.find(item => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      if (itemProductId !== productId) return false;

      if (variantId || variantTitle) {
        const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;
        return itemVariantId === variantId || itemVariantTitle === variantTitle;
      }

      const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
      const itemVariantTitle = (item.product as any).variantTitle;
      return !itemVariantId && !itemVariantTitle;
    });

    const previousItems = [...items];
    setItems((prevItems) => {
      const filtered = prevItems.filter(item => item?.product);
      const index = filtered.findIndex(item => {
        const itemProductId = item.product.id || item.product._id;
        if (itemProductId !== productId) return false;

        if (variantId || variantTitle) {
          const ivId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
          const ivTitle = (item.product as any).variantTitle || (item.product as any).pack;
          return ivId === variantId || ivTitle === variantTitle;
        }
        const ivId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const ivTitle = (item.product as any).variantTitle;
        return !ivId && !ivTitle;
      });

      if (index > -1) {
        const nextItems = [...filtered];
        nextItems[index] = { ...nextItems[index], quantity: sanitizedQty };
        return nextItems;
      }
      return filtered;
    });

    if (isAuthenticated && user?.userType === 'Customer' && itemToUpdate?.id) {
      try {
        const response = await apiUpdateCartItem(
          itemToUpdate.id,
          sanitizedQty,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
          setMinimumOrderValue(response.data.minimumOrderValue);
        }
      } catch (error) {
        console.error("Update quantity failed", error);
        setItems(previousItems);
      } finally {
        pendingOperationsRef.current.delete(operationKey);
      }
    } else {
      pendingOperationsRef.current.delete(operationKey);
    }
  };

  const clearCart = async () => {
    setItems([]);
    try {
      await apiClearCart();
    } catch (error) {
      console.error("Clear cart failed", error);
      await fetchCart();
    }
  };

  const refreshCart = async (latitude?: number, longitude?: number) => {
    await fetchCart(latitude, longitude);
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, lastAddEvent, loading }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
