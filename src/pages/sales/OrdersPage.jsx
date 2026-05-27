import { Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalization } from "../../context/LocalizationContext";
import {
  getOrderLifecycleOptions,
  getOrders,
  updateOrderLifecycleState,
} from "../../services/api";

const STATUS_TABS = [
  { key: "semua_orders", label: "All" },
  { key: "not_paid", label: "Unpaid" },
  { key: "need_ship", label: "Unfulfilled" },
  { key: "ongoing_shipped", label: "In transit" },
  { key: "receive", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const PAYMENT_BADGE = {
  paid: { variant: "default", label: "Paid" },
  pending: { variant: "secondary", label: "Pending" },
  refunded: { variant: "outline", label: "Refunded" },
  failed: { variant: "destructive", label: "Failed" },
};

const FULFILLMENT_BADGE = {
  fulfilled: { variant: "default", label: "Fulfilled" },
  unfulfilled: { variant: "secondary", label: "Unfulfilled" },
  partial: { variant: "outline", label: "Partial" },
  shipped: { variant: "outline", label: "Shipped" },
};

export default function OrdersPage() {
  const { formatCurrency } = useLocalization();
  const [selected, setSelected] = useState("semua_orders");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrders(selected);
      setOrders(data);
    } catch (err) {
      toast.error("Failed to load orders", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        action: { label: "Retry", onClick: loadOrders },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [selected]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      const haystack = [
        order.orderNumber,
        order.customerName,
        order.status,
        order.paymentStatus,
        order.fulfillmentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, search]);

  async function updateLifecycle(order, patch) {
    setUpdatingId(order.id);
    try {
      await updateOrderLifecycleState(order.id, patch);
      await loadOrders();
      toast.success("Order updated");
    } catch (err) {
      toast.error("Failed to update order", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setUpdatingId("");
    }
  }

  const tabCounts = useMemo(() => {
    const counts = { semua_orders: orders.length };
    for (const o of orders) {
      if (o.paymentStatus === "pending" || o.paymentStatus === "not_paid") {
        counts["not_paid"] = (counts["not_paid"] || 0) + 1;
      }
      if (o.fulfillmentStatus === "unfulfilled") {
        counts["need_ship"] = (counts["need_ship"] || 0) + 1;
      }
    }
    return counts;
  }, [orders]);

  return (
    <section className="grid gap-0">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold">Orders</h4>
        <Button variant="outline" size="sm">
          <Download className="size-4 mr-2" />
          Export
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4">
          <Tabs value={selected} onValueChange={setSelected}>
            <TabsList className="h-auto bg-transparent gap-0 p-0 rounded-none">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-sm"
                >
                  {tab.label}
                  {tabCounts[tab.key] != null && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>{visibleOrders.length} orders</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : visibleOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              visibleOrders.map((record) => {
                const paymentInfo = PAYMENT_BADGE[record.paymentStatus || "pending"] ?? {
                  variant: "outline",
                  label: record.paymentStatus || "Pending",
                };
                const fulfillInfo = FULFILLMENT_BADGE[record.fulfillmentStatus || "unfulfilled"] ?? {
                  variant: "outline",
                  label: record.fulfillmentStatus || "Unfulfilled",
                };
                const options = getOrderLifecycleOptions({
                  status: record.status,
                  paymentStatus: record.paymentStatus,
                  fulfillmentStatus: record.fulfillmentStatus,
                });

                const raw = record.created_at ?? record.createdAt;
                const dateStr = raw
                  ? new Date(raw).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Link
                        to={`/orders/${record.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{record.orderNumber ?? record.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{dateStr}</TableCell>
                    <TableCell className="text-sm">
                      {record.customerName ?? record.customer_name ?? "Guest"}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {formatCurrency(
                        record.displayTotal ?? record.total ?? record.total_price,
                        record.displayCurrencyCode || record.currencyCode || "USD",
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentInfo.variant}>{paymentInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fulfillInfo.variant}>{fulfillInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={record.status}
                        disabled={updatingId === record.id}
                        onValueChange={(value) =>
                          updateLifecycle(record, {
                            status: value,
                            note: `Status changed from ${record.status} to ${value}`,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.status.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Link to={`/orders/${record.id}`}>
                        <Button variant="link" size="sm" className="p-0 text-xs h-auto">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
