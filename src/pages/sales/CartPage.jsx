import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCart } from "../../context/CartContext";
import { getProducts } from "../../services/api";
import { formatCurrency } from "../../shared/format";

export default function CartPage() {
  const navigate = useNavigate();
  const {
    cart,
    refreshCart,
    addItem,
    updateItemQuantity,
    removeItem,
    isLoading,
  } = useCart();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    Promise.all([refreshCart(), getProducts("active")])
      .then(([, productRows]) => setProducts(productRows))
      .catch((err) => {
        toast.error(err.message || "Failed to load cart.");
      });
  }, [refreshCart]);

  async function handleAdd(product) {
    try {
      await addItem({ variantId: product.variantId, quantity: 1 });
      toast.success(`${product.name} added to cart.`);
    } catch (err) {
      toast.error(err.message || "Unable to add item.");
    }
  }

  async function handleQuantityChange(record, value) {
    try {
      await updateItemQuantity(record.id, Number(value));
    } catch (err) {
      toast.error(err.message || "Unable to update quantity.");
    }
  }

  async function handleRemove(record) {
    try {
      await removeItem(record.id);
    } catch (err) {
      toast.error(err.message || "Unable to remove item.");
    }
  }

  return (
    <section className="grid gap-4">
      <header>
        <h3 className="text-xl font-semibold">Cart</h3>
        <p className="text-muted-foreground">
          Build an order from active products, then continue to checkout.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Available Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No products available.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.sku}</TableCell>
                    <TableCell>{formatCurrency(p.price)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleAdd(p)}>
                        Add to cart
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Cart ({cart.items.length} items)</CardTitle>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">
              Subtotal: {formatCurrency(cart.subtotal)}
            </span>
            <Button
              disabled={!cart.items.length}
              onClick={() => navigate("/dashboard/checkout")}
            >
              Proceed to Checkout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Line Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : cart.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Cart is empty.
                  </TableCell>
                </TableRow>
              ) : (
                cart.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.variantTitle}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item, e.target.value)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>{formatCurrency(item.lineTotal)}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(item)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
