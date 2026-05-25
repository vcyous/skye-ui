// Authentication & Profiles
export interface PreviewProduct {
  id: string;
  name: string;
  handle: string;
  price: number;
  currency?: string;
  imageUrl: string | null;
  status?: string;
  description?: string;
  variantId: string | null;
  stock: number;
}

export interface TemplateProps {
  config: {
    texts: Record<string, string>;
    colors: Record<string, string>;
    images: Record<string, string>;
    catalog: {
      collectionId: string | null;
      displayCount: number;
      layout: string;
    };
  };
  storeName: string;
  products?: PreviewProduct[];
  storeSlug?: string;
  onAddToCart?: (product: PreviewProduct) => void;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive" | string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StoreSummary {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  currencyCode: string;
  timezone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // NEW — website builder fields
  isPublished: boolean;
  subdomain: string | null;
  onboardingCompletedAt: string | null;
}

export interface AuthSessionData {
  user: UserProfile | null;
  store: StoreSummary | null;
  stores: StoreSummary[];
  currentRole: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  requiresEmailVerification?: boolean;
}

// Product Domain
export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  priceStartAt: string | null;
  priceEndAt: string | null;
  isPriceWindowActive?: boolean;
  quantity_in_stock: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  urlHandle: string;
  description: string;
  tags: string[];
  variantId: string | null;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  priceStartAt: string | null;
  priceEndAt: string | null;
  isPriceWindowActive: boolean;
  quantity_in_stock: number;
  stock: number;
  status: "active" | "draft" | "archived";
  vendor: string | null;
  productType: string | null;
  seoTitle: string;
  seoDescription: string;
  mediaUrls: string[];
  rating: number | null;
  created_at: string;
  updated_at: string;
}

// Cart Domain
export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  price: number;
  quantity: number;
  mediaUrl: string | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
}
