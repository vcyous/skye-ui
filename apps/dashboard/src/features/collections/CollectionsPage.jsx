import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/api";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ────────────────────────────────────────────────────────────────
// Form Sheet — Buat / Edit Koleksi
// ────────────────────────────────────────────────────────────────
function CollectionFormSheet({
  open,
  onOpenChange,
  storeId,
  editData,
  onSaved,
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editData?.name ?? "");
      setSlug(editData?.slug ?? "");
      setDescription(editData?.description ?? "");
    }
  }, [open, editData]);

  function handleNameChange(val) {
    setName(val);
    if (!editData) setSlug(slugify(val));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Nama dan slug wajib diisi");
      return;
    }
    setLoading(true);
    try {
      if (editData) {
        const { error } = await supabase
          .from("collections")
          .update({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
          })
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Koleksi diperbarui");
      } else {
        const { error } = await supabase.from("collections").insert({
          store_id: storeId,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
        });
        if (error) throw error;
        toast.success("Koleksi dibuat");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan koleksi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editData ? "Edit Koleksi" : "Buat Koleksi"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-4 pb-6 space-y-4 mt-4">
          <div>
            <Label htmlFor="col-name">Nama Koleksi</Label>
            <Input
              id="col-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Baju Musim Panas"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="col-slug">Slug (URL)</Label>
            <Input
              id="col-slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="baju-musim-panas"
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Hanya huruf kecil, angka, dan tanda hubung.
            </p>
          </div>
          <div>
            <Label htmlFor="col-desc">Deskripsi (opsional)</Label>
            <Textarea
              id="col-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {editData ? "Simpan Perubahan" : "Buat Koleksi"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ────────────────────────────────────────────────────────────────
// Product Manager Sheet — Assign/remove produk dari koleksi
// ────────────────────────────────────────────────────────────────
function ProductManagerSheet({ open, onOpenChange, storeId, collection }) {
  const [allProducts, setAllProducts] = useState([]);
  const [assigned, setAssigned] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !collection) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("products")
        .select("id, name, status")
        .eq("store_id", storeId)
        .order("name"),
      supabase
        .from("product_collections")
        .select("product_id")
        .eq("collection_id", collection.id),
    ]).then(([prodRes, assignRes]) => {
      if (prodRes.error) toast.error("Gagal memuat produk");
      else setAllProducts(prodRes.data ?? []);

      const ids = new Set((assignRes.data ?? []).map((r) => r.product_id));
      setAssigned(ids);
      setLoading(false);
    });
  }, [open, collection, storeId]);

  function toggleProduct(productId) {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function handleSave() {
    if (!collection) return;
    setSaving(true);
    try {
      // Hapus semua assignment lama lalu insert yang baru
      const { error: delErr } = await supabase
        .from("product_collections")
        .delete()
        .eq("collection_id", collection.id);
      if (delErr) throw delErr;

      if (assigned.size > 0) {
        const rows = Array.from(assigned).map((pid, i) => ({
          collection_id: collection.id,
          product_id: pid,
          display_order: i,
        }));
        const { error: insErr } = await supabase
          .from("product_collections")
          .insert(rows);
        if (insErr) throw insErr;
      }

      toast.success("Produk koleksi disimpan");
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Produk — {collection?.name}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="space-y-2 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : allProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">
              Belum ada produk di toko.
            </p>
          ) : (
            <div className="space-y-1 mt-4">
              {allProducts.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={assigned.has(p.id)}
                    onCheckedChange={() => toggleProduct(p.id)}
                  />
                  <span className="flex-1 text-sm">{p.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${p.status === "active" ? "text-emerald-700" : "text-muted-foreground"}`}
                  >
                    {p.status}
                  </Badge>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 pb-4">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Simpan ({assigned.size} produk)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const { store } = useAuth();
  const [collections, setCollections] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [productMgrOpen, setProductMgrOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState(null);

  const loadCollections = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("store_id", store.id)
      .order("display_order")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat koleksi");
    } else {
      setCollections(data ?? []);
      // Hitung jumlah produk per koleksi
      if (data?.length) {
        const ids = data.map((c) => c.id);
        const { data: counts } = await supabase
          .from("product_collections")
          .select("collection_id")
          .in("collection_id", ids);
        const map = {};
        (counts ?? []).forEach((r) => {
          map[r.collection_id] = (map[r.collection_id] || 0) + 1;
        });
        setProductCounts(map);
      }
    }
    setLoading(false);
  }, [store?.id]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  function openCreate() {
    setEditData(null);
    setFormOpen(true);
  }

  function openEdit(col) {
    setEditData(col);
    setFormOpen(true);
  }

  function openProductMgr(col) {
    setActiveCollection(col);
    setProductMgrOpen(true);
  }

  async function handleDelete(col) {
    if (
      !window.confirm(
        `Hapus koleksi "${col.name}"? Produk tidak ikut terhapus.`,
      )
    )
      return;
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", col.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Koleksi dihapus");
      loadCollections();
    }
  }

  async function handleToggleActive(col) {
    const { error } = await supabase
      .from("collections")
      .update({ is_active: !col.is_active })
      .eq("id", col.id);
    if (error) {
      toast.error(error.message);
    } else {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === col.id ? { ...c, is_active: !c.is_active } : c,
        ),
      );
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Koleksi</h4>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          Buat Koleksi
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : collections.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Layers className="size-8 mx-auto mb-2 opacity-30" />
                  Belum ada koleksi. Klik "Buat Koleksi" untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              collections.map((col) => (
                <TableRow key={col.id}>
                  <TableCell className="font-medium text-sm">
                    {col.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {col.slug}
                  </TableCell>
                  <TableCell className="text-sm">
                    {productCounts[col.id] ?? 0} produk
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(col)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        col.is_active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {col.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openProductMgr(col)}
                        className="text-xs"
                      >
                        Produk
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(col)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(col)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CollectionFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        storeId={store?.id}
        editData={editData}
        onSaved={loadCollections}
      />

      <ProductManagerSheet
        open={productMgrOpen}
        onOpenChange={setProductMgrOpen}
        storeId={store?.id}
        collection={activeCollection}
      />
    </section>
  );
}
