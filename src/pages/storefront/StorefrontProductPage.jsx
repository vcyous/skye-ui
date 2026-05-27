import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../services/supabaseClient";

async function fetchProductByHandle(handle) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, title, description, media_urls, handle,
      product_variants(id, price, quantity_in_stock),
      stores!inner(id, name, is_published)
    `,
    )
    .eq("handle", handle)
    .eq("status", "active")
    .eq("stores.is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  const variant = Array.isArray(data.product_variants)
    ? data.product_variants[0]
    : null;
  return {
    id: data.id,
    name: data.title,
    handle: data.handle,
    price: Number(variant?.price ?? 0),
    imageUrl:
      Array.isArray(data.media_urls) && data.media_urls.length > 0
        ? data.media_urls[0]
        : null,
    description: data.description ?? "",
    variantId: variant?.id ?? null,
    stock: Number(variant?.quantity_in_stock ?? 0),
  };
}

export default function StorefrontProductPage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!handle) return;
    setIsLoading(true);
    fetchProductByHandle(handle)
      .then((result) => setProduct(result))
      .finally(() => setIsLoading(false));
  }, [handle]);

  async function handleAddToCart() {
    if (!product?.variantId) return;
    setIsAdding(true);
    try {
      await addItem({ variantId: product.variantId, quantity });
      toast.success(`${product.name} added to cart!`);
      navigate("/storefront/cart");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not add to cart.";
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen p-10 text-center">
        <h3 className="text-xl font-semibold mb-4">Product not found</h3>
        <Button variant="outline" onClick={() => navigate("/storefront")}>
          ← Back to Store
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button
        variant="link"
        className="mb-4 px-0"
        onClick={() => navigate("/storefront")}
      >
        ← Back to Store
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full rounded-xl object-cover aspect-square"
            />
          ) : (
            <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-xl font-semibold">
            Rp {product.price.toLocaleString("id-ID")}
          </p>
          {product.description && (
            <p className="text-foreground">{product.description}</p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm">Quantity:</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, product.stock)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-20 border rounded-md px-2 py-1 text-sm"
            />
          </div>

          {product.stock === 0 && (
            <span className="text-destructive text-sm">Out of stock</span>
          )}

          <Button
            size="lg"
            disabled={product.stock === 0 || !product.variantId || isAdding}
            onClick={handleAddToCart}
            className="max-w-xs"
          >
            {isAdding && <Loader2 className="size-4 animate-spin mr-2" />}
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
