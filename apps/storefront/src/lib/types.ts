export type Store = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  settings: Record<string, unknown> | null;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category: string | null;
  tags: string[] | null;
  status: string;
  media_urls: string[] | null;
  stock: number | null;
};

export type Order = {
  id: string;
  store_id: string;
  order_number: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_name: string | null;
  status: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  shipping_method: string | null;
  shipping_address: Record<string, unknown> | null;
  payment_method: string | null;
  payment_status: string;
  notes: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_name: string | null;
  price: number;
  quantity: number;
};

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  stock: number | null;
};

export type ThemeConfig = {
  primaryColor?: string;
  accent?: string;
  fontHeading?: string;
  fontBody?: string;
  borderRadius?: number;
  cardStyle?: "flat" | "shadow" | "outlined";
  heroLayout?: "split" | "full-bleed" | "centered";
};

export type Theme = {
  id: string;
  store_id: string;
  template_slug: string;
  config_json: ThemeConfig;
};
