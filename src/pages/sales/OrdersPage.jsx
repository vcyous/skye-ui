import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { key: "semua", label: "Semua", status: null },
  { key: "baru", label: "Baru", status: "baru" },
  { key: "diproses", label: "Diproses", status: "diproses" },
  { key: "selesai", label: "Selesai", status: "selesai" },
  { key: "dibatalkan", label: "Dibatalkan", status: "dibatalkan" },
];

function formatRupiah(value) {
  return "Rp " + Number(value ?? 0).toLocaleString("id-ID");
}

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const map = {
    baru: "bg-amber-100 text-amber-800",
    diproses: "bg-blue-100 text-blue-800",
    selesai: "bg-emerald-100 text-emerald-800",
    dibatalkan: "bg-red-100 text-red-800",
  };
  const cls = map[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function NewCountDot({ count }) {
  if (!count) return null;
  return (
    <span className="relative ml-1.5 inline-flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
    </span>
  );
}

function OrderDetailSheet({ order, open, onOpenChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
    setItems([]);
    setLoading(true);
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Gagal memuat item order");
        } else {
          setItems(data ?? []);
        }
        setLoading(false);
      });
  }, [open, order]);

  if (!order) return null;

  const address = order.shipping_address ?? {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detail Order #{order.order_number}</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Informasi Pembeli</p>
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Nama:</span> {order.buyer_name ?? "—"}
              </p>
              <p>
                <span className="font-medium">Email:</span> {order.buyer_email ?? "—"}
              </p>
              <p>
                <span className="font-medium">Telepon:</span> {order.buyer_phone ?? "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Alamat Pengiriman</p>
            <div className="text-sm space-y-0.5">
              {address.street && <p>{address.street}</p>}
              {address.city && (
                <p>
                  {address.city}
                  {address.province ? `, ${address.province}` : ""}
                  {address.postal_code ? ` ${address.postal_code}` : ""}
                </p>
              )}
              {!address.street && !address.city && <p className="text-muted-foreground">—</p>}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Item Pesanan</p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada item</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p>{formatRupiah(item.price)}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            {order.shipping_cost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{formatRupiah(order.shipping_cost)}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-emerald-600">-{formatRupiah(order.discount_amount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
          </div>

          {order.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Catatan</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function OrdersPage() {
  const { store } = useAuth();
  const [activeTab, setActiveTab] = useState("semua");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    const tab = TABS.find((t) => t.key === activeTab);
    let query = supabase
      .from("orders")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (tab?.status) {
      query = query.eq("status", tab.status);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Gagal memuat order", { description: error.message });
    } else {
      setOrders(data ?? []);
    }
    setLoading(false);
  }, [store?.id, activeTab]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const newCount = useMemo(
    () => orders.filter((o) => o.status === "baru").length,
    [orders],
  );

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (o) =>
        (o.order_number ?? "").toLowerCase().includes(term) ||
        (o.buyer_name ?? "").toLowerCase().includes(term),
    );
  }, [orders, search]);

  async function handleProses(order) {
    setProcessingId(order.id);
    const { error } = await supabase
      .from("orders")
      .update({ status: "diproses", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    if (error) {
      toast.error("Gagal memproses order", { description: error.message });
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "diproses" } : o)),
      );
      toast.success(`Order #${order.order_number} dipindah ke Diproses`);
    }
    setProcessingId(null);
  }

  function handleDetail(order) {
    setDetailOrder(order);
    setSheetOpen(true);
  }

  function handleTabChange(key) {
    setActiveTab(key);
    setSearch("");
  }

  function handleExport() {
    toast.info("Mengekspor...");
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Orders</h4>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="size-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="h-auto bg-transparent gap-0 p-0 rounded-none">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2.5 text-sm"
                >
                  {tab.label}
                  {tab.key === "baru" && <NewCountDot count={newCount} />}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <span className="ml-auto text-sm text-muted-foreground">
            {visibleOrders.length} order
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#Order</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : visibleOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  Belum ada order
                </TableCell>
              </TableRow>
            ) : (
              visibleOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-sm">
                    #{order.order_number}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{order.buyer_name ?? "—"}</p>
                    {order.buyer_email && (
                      <p className="text-xs text-muted-foreground">
                        {order.buyer_email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatRupiah(order.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.status === "baru" && (
                        <Button
                          size="sm"
                          disabled={processingId === order.id}
                          onClick={() => handleProses(order)}
                        >
                          Proses
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDetail(order)}
                      >
                        Detail
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <OrderDetailSheet
        order={detailOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </section>
  );
}
