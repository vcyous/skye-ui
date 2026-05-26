import {
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
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
    <section style={{ display: "grid", gap: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Products
        </Typography.Title>
        <Space>
          <Button icon={<ImportOutlined />}>Import</Button>
          <Button icon={<ExportOutlined />}>Export</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateOpen(true)}
          >
            Add product
          </Button>
        </Space>
      </div>

      {submitError && (
        <Alert
          type="error"
          message={submitError}
          showIcon
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setSubmitError("")}
        />
      )}
      {notice && (
        <Alert
          type="success"
          message={notice}
          showIcon
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setNotice("")}
        />
      )}
      {loadError && (
        <Alert
          type="error"
          message="Failed to load products"
          description={loadError}
          showIcon
          style={{ marginBottom: 12 }}
          action={
            <Button size="small" onClick={loadProducts}>
              Retry
            </Button>
          }
        />
      )}

      <Card bodyStyle={{ padding: 0 }}>
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
          <div style={{ padding: 48 }}>
            <Empty
              description={
                <Space direction="vertical" size={4}>
                  <Typography.Text strong>No products found</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    Add your first product to start building your catalog.
                  </Typography.Text>
                </Space>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateOpen(true)}
              >
                Add product
              </Button>
            </Empty>
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
