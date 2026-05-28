import { useEffect } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProductFormModal from "./components/ProductFormModal";
import ProductsFilterBar from "./components/ProductsFilterBar";
import ProductsTable from "./components/ProductsTable";
import { useProducts } from "./hooks/useProducts";

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const {
    visibleProducts,
    tabCounts,
    isLoading,
    loadError,
    status,
    setStatus,
    search,
    setSearch,
    category,
    setCategory,
    selectedRowKeys,
    setSelectedRowKeys,
    isSubmitting,
    isBulkBusy,
    createNew,
    update,
    remove,
    bulkUpdateStatus,
    bulkRemove,
    uploadImage,
    notice,
    setNotice,
    submitError,
    setSubmitError,
  } = useProducts();

  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Show toasts for notices/errors
  useEffect(() => {
    if (notice) {
      toast.success(notice);
      setNotice("");
    }
  }, [notice, setNotice]);

  useEffect(() => {
    if (submitError) {
      toast.error(submitError);
      setSubmitError("");
    }
  }, [submitError, setSubmitError]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, status, category]);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PAGE_SIZE));
  const pagedProducts = visibleProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate(values, mediaUrls) {
    const ok = await createNew(values, mediaUrls);
    if (ok) setIsCreateOpen(false);
  }

  async function handleUpdate(values, mediaUrls) {
    if (!editingProduct) return;
    const ok = await update(editingProduct.id, values, mediaUrls);
    if (ok) setEditingProduct(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Produk</h2>
      </div>

      <Card className="overflow-hidden p-0">
        <ProductsFilterBar
          status={status}
          onStatusChange={setStatus}
          tabCounts={tabCounts}
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          selectedCount={selectedRowKeys.length}
          isBulkBusy={isBulkBusy}
          onBulkStatusChange={bulkUpdateStatus}
          onBulkDelete={bulkRemove}
          onAdd={() => setIsCreateOpen(true)}
        />

        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-6 text-center text-sm text-destructive">{loadError}</div>
        ) : (
          <ProductsTable
            products={pagedProducts}
            selectedRowKeys={selectedRowKeys}
            onSelectRow={setSelectedRowKeys}
            onSelectAll={setSelectedRowKeys}
            onEdit={setEditingProduct}
            onDelete={remove}
          />
        )}

        {!isLoading && !loadError && visibleProducts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>
              {Math.min((page - 1) * PAGE_SIZE + 1, visibleProducts.length)}–
              {Math.min(page * PAGE_SIZE, visibleProducts.length)} dari{" "}
              {visibleProducts.length} produk
            </span>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 rounded hover:bg-accent disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`px-2.5 py-1 rounded text-sm ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="px-2 py-1 rounded hover:bg-accent disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Create modal */}
      <ProductFormModal
        mode="create"
        open={isCreateOpen}
        product={null}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
        onCancel={() => setIsCreateOpen(false)}
        onUploadImage={uploadImage}
      />

      {/* Edit modal */}
      <ProductFormModal
        mode="edit"
        open={!!editingProduct}
        product={editingProduct}
        isSubmitting={isSubmitting}
        onSubmit={handleUpdate}
        onCancel={() => setEditingProduct(null)}
        onUploadImage={uploadImage}
      />
    </div>
  );
}
