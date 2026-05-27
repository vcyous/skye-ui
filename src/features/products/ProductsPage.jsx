import { Download, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ProductFormModal from "./components/ProductFormModal";
import ProductsFilterBar from "./components/ProductsFilterBar";
import ProductsTable from "./components/ProductsTable";
import { useProducts } from "./hooks/useProducts";

export default function ProductsPage() {
  const { addItem } = useCart();
  const {
    visibleProducts,
    tabCounts,
    isLoading,
    loadError,
    status,
    setStatus,
    search,
    setSearch,
    sortBy,
    setSortBy,
    selectedRowKeys,
    setSelectedRowKeys,
    submitError,
    setSubmitError,
    notice,
    setNotice,
    isSubmitting,
    isUpdating,
    isBulkBusy,
    loadProducts,
    createNew,
    update,
    remove,
    bulkUpdateStatus,
    bulkRemove,
    uploadImage,
  } = useProducts();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  async function handleAddToCart(product) {
    setSubmitError("");
    setNotice("");
    try {
      await addItem({ variantId: product.variantId ?? "", quantity: 1 });
      setNotice(`Added ${product.name} to cart.`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to add product to cart.",
      );
    }
  }

  async function handleCreate(values, mediaUrls) {
    const ok = await createNew(values, mediaUrls);
    if (ok) setIsCreateOpen(false);
    return ok;
  }

  async function handleEditSubmit(values, mediaUrls) {
    if (!editingProduct) return false;
    const ok = await update(editingProduct.id, values, mediaUrls);
    if (ok) setEditingProduct(null);
    return ok;
  }

  const isEmpty = visibleProducts.length === 0 && !isLoading;

  return (
    <section className="grid gap-0">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xl font-semibold">Products</h4>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="size-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add product
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <ProductsFilterBar
          status={status}
          onStatusChange={setStatus}
          tabCounts={tabCounts}
          search={search}
          onSearchChange={setSearch}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          selectedCount={selectedRowKeys.length}
          isBulkBusy={isBulkBusy}
          onBulkStatusChange={bulkUpdateStatus}
          onBulkDelete={bulkRemove}
        />

        {isEmpty ? (
          <div className="grid place-items-center p-12 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <p className="font-medium text-foreground">No products found</p>
              <p className="text-sm">
                Add your first product to start building your catalog.
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="size-4 mr-2" />
                Add product
              </Button>
            </div>
          </div>
        ) : (
          <ProductsTable
            products={visibleProducts}
            isLoading={isLoading}
            selectedRowKeys={selectedRowKeys}
            onSelectionChange={setSelectedRowKeys}
            onEdit={setEditingProduct}
            onAddToCart={handleAddToCart}
            onDelete={remove}
          />
        )}
      </Card>

      <ProductFormModal
        mode="create"
        open={isCreateOpen}
        product={null}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
        onCancel={() => setIsCreateOpen(false)}
        onUploadImage={uploadImage}
      />

      <ProductFormModal
        mode="edit"
        open={Boolean(editingProduct)}
        product={editingProduct}
        isSubmitting={isUpdating}
        onSubmit={handleEditSubmit}
        onCancel={() => setEditingProduct(null)}
        onUploadImage={uploadImage}
      />
    </section>
  );
}
