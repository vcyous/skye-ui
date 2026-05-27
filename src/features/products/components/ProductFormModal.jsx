import { Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_OPTIONS } from "../constants";
import { toProductFormValues } from "../productMapper";

function ImageUploader({ onUpload, urls }) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBusy(true);
    try {
      await onUpload(file);
    } finally {
      setIsBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
        <Upload className="size-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mt-1">Add image</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-18 h-18 object-cover rounded-md border"
              style={{ width: 72, height: 72 }}
            />
          ))}
        </div>
      )}
      {isBusy && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
          Uploading...
        </span>
      )}
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
  const title = isEdit ? "Edit product" : "Add product";
  const okText = isEdit ? "Save changes" : "Save product";

  const [mediaUrls, setMediaUrls] = useState([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: {} });

  useEffect(() => {
    if (!open) return;
    if (isEdit && product) {
      reset(toProductFormValues(product));
      setMediaUrls([...(product.mediaUrls || [])]);
    } else {
      reset({});
      setMediaUrls([]);
    }
  }, [open, isEdit, product, reset]);

  async function handleUpload(file) {
    const url = await onUploadImage(file);
    if (url) {
      setMediaUrls((prev) => [...prev, url]);
    }
  }

  async function handleFinish(values) {
    const ok = await onSubmit(values, mediaUrls);
    if (ok) {
      reset({});
      setMediaUrls([]);
    }
  }

  function handleCancel() {
    reset({});
    setMediaUrls([]);
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          id="product-form"
          onSubmit={handleSubmit(handleFinish)}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3">
            <div className="flex flex-col gap-3">
              <Card>
                <CardContent className="pt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">Title</Label>
                    <Input
                      id="name"
                      placeholder={isEdit ? undefined : "Short sleeve t-shirt"}
                      {...register("name", { required: "Title is required" })}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      placeholder={isEdit ? undefined : "Describe your product..."}
                      {...register("description")}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUploader onUpload={handleUpload} urls={mediaUrls} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Pricing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="price">Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          id="price"
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={isEdit ? undefined : "0.00"}
                          className="pl-7"
                          {...register("price", {
                            required: "Price is required",
                            valueAsNumber: true,
                          })}
                          aria-invalid={!!errors.price}
                        />
                      </div>
                      {errors.price && (
                        <p className="text-xs text-destructive">{errors.price.message}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="compareAtPrice">Compare-at price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          id="compareAtPrice"
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={isEdit ? undefined : "0.00"}
                          className="pl-7"
                          {...register("compareAtPrice", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="costPrice">Cost per item</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          id="costPrice"
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={isEdit ? undefined : "0.00"}
                          className="pl-7"
                          {...register("costPrice", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="sku">
                        {isEdit ? "SKU" : "SKU (Stock Keeping Unit)"}
                      </Label>
                      <Input
                        id="sku"
                        placeholder={isEdit ? undefined : "SKU-001"}
                        {...register("sku", { required: "SKU is required" })}
                        aria-invalid={!!errors.sku}
                      />
                      {errors.sku && (
                        <p className="text-xs text-destructive">{errors.sku.message}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="stock">Quantity</Label>
                      <Input
                        id="stock"
                        type="number"
                        min={0}
                        {...register("stock", {
                          required: "Quantity is required",
                          valueAsNumber: true,
                        })}
                        aria-invalid={!!errors.stock}
                      />
                      {errors.stock && (
                        <p className="text-xs text-destructive">{errors.stock.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Search engine listing</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="urlHandle">URL handle</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">products/</span>
                      <Input
                        id="urlHandle"
                        placeholder={isEdit ? undefined : "short-sleeve-t-shirt"}
                        className="pl-[76px]"
                        {...register("urlHandle")}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="seoTitle">Page title</Label>
                    <Input
                      id="seoTitle"
                      placeholder={isEdit ? undefined : "SEO title (70 characters max)"}
                      maxLength={70}
                      {...register("seoTitle")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="seoDescription">Meta description</Label>
                    <Textarea
                      id="seoDescription"
                      rows={3}
                      placeholder={isEdit ? undefined : "SEO description (160 characters max)"}
                      maxLength={160}
                      {...register("seoDescription")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    control={control}
                    name="status"
                    defaultValue={isEdit ? undefined : "draft"}
                    rules={{ required: "Status is required" }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Product organization</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      placeholder={isEdit ? undefined : "Acme"}
                      {...register("vendor")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="productType">Product type</Label>
                    <Input
                      id="productType"
                      placeholder={isEdit ? undefined : "Apparel"}
                      {...register("productType")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      placeholder={
                        isEdit
                          ? "comma separated"
                          : "fashion, summer (comma separated)"
                      }
                      {...register("tags")}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Sale schedule</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="priceStartAt">Start date</Label>
                    <Input
                      id="priceStartAt"
                      type="datetime-local"
                      {...register("priceStartAt")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="priceEndAt">End date</Label>
                    <Input
                      id="priceEndAt"
                      type="datetime-local"
                      {...register("priceEndAt")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {okText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
