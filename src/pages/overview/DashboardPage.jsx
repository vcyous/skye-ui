import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  ClipboardList,
  DollarSign,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../../context/AuthContext";
import { useLocalization } from "../../context/LocalizationContext";
import { supabase } from "../../services/api";

function StatCard({ title, value, icon, sub, subColor = "text-muted-foreground" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && (
          <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { label: "Tambah produk", to: "/dashboard/products", desc: "Perluas katalog kamu" },
  { label: "Lihat semua order", to: "/dashboard/orders", desc: "Kelola order masuk" },
  { label: "Kustomisasi tema", to: "/dashboard/theme", desc: "Edit tampilan toko" },
  { label: "Pengaturan toko", to: "/dashboard/settings", desc: "Domain & info toko" },
];

export default function DashboardPage() {
  const { store } = useAuth();
  const { formatCurrency } = useLocalization();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    totalProducts: 0,
    pendingCount: 0,
  });
  const [pendingOrders, setPendingOrders] = useState([]);

  useEffect(() => {
    if (!store?.id) return;
    loadStats(store.id);
  }, [store?.id]);

  async function loadStats(storeId) {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [ordersToday, productsCount, pendingResult] = await Promise.all([
        supabase
          .from("orders")
          .select("total, status")
          .eq("store_id", storeId)
          .gte("created_at", todayIso),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId),
        supabase
          .from("orders")
          .select("id, order_number, buyer_name, status, total")
          .eq("store_id", storeId)
          .eq("status", "baru")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const todayRevenue = (ordersToday.data || []).reduce(
        (sum, o) => sum + Number(o.total || 0),
        0,
      );

      setStats({
        todayRevenue,
        todayOrders: (ordersToday.data || []).length,
        totalProducts: productsCount.count || 0,
        pendingCount: (pendingResult.data || []).length,
      });
      setPendingOrders(pendingResult.data || []);
    } catch {
      // silently fail — placeholders stay at 0
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Memuat dashboard…</span>
      </div>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Beranda</h2>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/orders">
            <Button variant="outline" size="sm">Lihat order</Button>
          </Link>
          <Link to="/dashboard/products">
            <Button size="sm">+ Produk</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title="Pendapatan hari ini"
          value={formatCurrency(stats.todayRevenue)}
          icon={<DollarSign className="size-4" />}
          sub={stats.todayOrders > 0 ? `dari ${stats.todayOrders} order` : "Belum ada order"}
        />
        <StatCard
          title="Order hari ini"
          value={stats.todayOrders}
          icon={<ShoppingBag className="size-4" />}
        />
        <StatCard
          title="Total produk"
          value={stats.totalProducts}
          icon={<Box className="size-4" />}
        />
        <StatCard
          title="Perlu diproses"
          value={stats.pendingCount}
          icon={<ClipboardList className="size-4" />}
          sub={stats.pendingCount > 0 ? "Order menunggu konfirmasi" : "Semua order terproses"}
          subColor={stats.pendingCount > 0 ? "text-amber-600" : "text-emerald-600"}
        />
      </div>

      {pendingOrders.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                  Perlu tindakan
                </Badge>
                <span className="font-semibold text-amber-900 text-sm">
                  {pendingOrders.length} order menunggu
                </span>
              </div>
              <Link to="/dashboard/orders">
                <Button variant="ghost" size="sm" className="text-amber-900 h-auto py-1">
                  Lihat semua →
                </Button>
              </Link>
            </div>
            <ul className="space-y-2">
              {pendingOrders.slice(0, 3).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between rounded border border-amber-200 bg-white px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {order.order_number}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      — {order.buyer_name || "Tamu"}
                    </span>
                  </div>
                  <Link to={`/dashboard/orders`}>
                    <Button size="sm" variant="outline">Proses</Button>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aksi cepat</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link to={action.to} key={action.to}>
                  <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-foreground/30 hover:bg-accent/40">
                    <div>
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <span className="text-muted-foreground text-sm">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Info toko</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nama toko</span>
              <span className="font-medium">{store?.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge
                className={
                  store?.isPublished
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-muted text-muted-foreground"
                }
              >
                {store?.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subdomain</span>
              <span className="font-mono text-xs">
                {store?.slug ? `${store.slug}.skye.shop` : "—"}
              </span>
            </div>
            <div className="pt-1">
              <Link to="/dashboard/settings">
                <Button variant="outline" size="sm" className="w-full">
                  Kelola pengaturan
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
