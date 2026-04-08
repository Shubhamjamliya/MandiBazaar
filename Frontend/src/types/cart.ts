import { Product } from './domain';

export interface CartItem {
  id?: string;
  product: Product;
  quantity: number;
  variant?: any;
  hsnCode?: string;
  gstPercentage?: number;
  seller?: {
    id: string;
    storeName: string;
    taxName?: string;
    taxNumber?: string;
    fssaiLicNo?: string;
    phone?: string;
  };
}

export interface Cart {
  items: CartItem[];
  totalItemCount?: number;
  itemCount?: number;
  total: number;
  estimatedDeliveryFee?: number;
  platformFee?: number;
  freeDeliveryThreshold?: number;
  minimumOrderValue?: number;
  debug_config?: any;
  backendTotal?: number;
}
