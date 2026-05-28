import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toProductFormValues } from "../productMapper";

const MAX_IMAGES = 5;
const MAX_SIZE_MB = 2;

function PhotoDropzone({ urls, onUpload, onRemove, disabled }) {
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return;
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={i} className="relative group">
            <img
              src={url}
              alt=""
              className="w-16 h-16 object-cover rounded-md border"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="size-2.5" />
            </button>
          </div>
        ))}
        {urls.length < MAX_IMAGES && (
          <label
            className={`flex flex-col items-center justify-center w-16 h-16 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${disabled || busy ? "opacity-50 pointer-events-none" : ""}`}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="size-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Upload
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
              disabled={disabled || busy}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Maks {MAX_IMAGES} foto, {MAX_SIZE_MB}MB per foto
      </p>
    </div>
  );
}

export default function ProductFormModal({
  mode,
  open,
  product,
  isSubmitting,
  onSubmit,
  onCancel,
  onUploadImage,
}) {
  const isEdit = mode === "edit";

  const [mediaUrls, setMediaUrls] = useState([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { status: "draft" } });

  const statusValue = watch("status");
  const isActive = statusValue === "active";

  useEffect(() => {
    if (!open) return;
    if (isEdit && product) {
      reset(toProductFormValues(product));
      setMediaUrls(
        Array.isArray(product.media_urls) ? [...product.media_urls] : [],
      );
    } else {
      reset({ status: "draft", stock: 0, price: "" });
      setMediaUrls([]);
    }
  }, [open, isEdit, product, reset]);

  async function handleUpload(file) {
    const url = await onUploadImage(file);
    if (url) setMediaUrls((prev) => [...prev, url]);
  }

  function handleRemoveImage(idx) {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleFinish(values) {
    const ok = await onSubmit(values, mediaUrls);
    if (ok) {
      reset({ status: "draft" });
      setMediaUrls([]);
    }
  }

  function handleCancel() {
    reset({ status: "draft" });
    setMediaUrls([]);
    onCancel();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleCancel();
      }}
    >
      <DialogContent className="w-[95vw] sm:w-[95vw] sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit(handleFinish)}>
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
            {/* Left — Product Info */}
            <div className="flex flex-col gap-3">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">Info Produk</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">Nama Produk *</Label>
                    <Input
                      id="name"
                      placeholder="Contoh: Kemeja Batik Pria"
                      {...register("name", { required: "Nama wajib diisi" })}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      rows={6}
                      placeholder="Deskripsikan produkmu..."
                      {...register("description")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="price">Harga (Rp) *</Label>
                      <Input
                        id="price"
                        type="number"
                        min={0}
                        placeholder="0"
                        {...register("price", {
                          required: "Harga wajib diisi",
                          min: { value: 0, message: "Harga tidak valid" },
                        })}
                        aria-invalid={!!errors.price}
                      />
                      {errors.price && (
                        <p className="text-xs text-destructive">
                          {errors.price.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="stock">Stok *</Label>
                      <Input
                        id="stock"
                        type="number"
                        min={0}
                        placeholder="0"
                        {...register("stock", {
                          required: "Stok wajib diisi",
                          min: { value: 0, message: "Stok tidak valid" },
                        })}
                        aria-invalid={!!errors.stock}
                      />
                      {errors.stock && (
                        <p className="text-xs text-destructive">
                          {errors.stock.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="category">Kategori</Label>
                      <Input
                        id="category"
                        placeholder="Contoh: Atasan"
                        {...register("category")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="compareAtPrice">Harga Coret (Rp)</Label>
                      <Input
                        id="compareAtPrice"
                        type="number"
                        min={0}
                        placeholder="0"
                        {...register("compareAtPrice")}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      placeholder="batik, pria, formal (pisahkan dengan koma)"
                      {...register("tags")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right — Photo + Status */}
            <div className="flex flex-col gap-3">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">Foto Produk</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotoDropzone
                    urls={mediaUrls}
                    onUpload={handleUpload}
                    onRemove={handleRemoveImage}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {isActive
                        ? "Aktif — tampil di toko"
                        : "Draft — tidak tampil"}
                    </span>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        setValue("status", checked ? "active" : "draft")
                      }
                    />
                  </div>
                  <input type="hidden" {...register("status")} />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setValue("status", "draft");
              handleSubmit(handleFinish)();
            }}
          >
            Simpan Draft
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setValue("status", "active");
              handleSubmit(handleFinish)();
            }}
          >
            {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Publikasi ✓
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
