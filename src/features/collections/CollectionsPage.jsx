import { PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Typography,
} from "antd";
import { useState } from "react";
import AssignProductsModal from "./components/AssignProductsModal";
import CollectionFormModal from "./components/CollectionFormModal";
import CollectionPreviewModal from "./components/CollectionPreviewModal";
import CollectionsFilterBar from "./components/CollectionsFilterBar";
import CollectionsTable from "./components/CollectionsTable";
import { useCollections } from "./hooks/useCollections";

export default function CollectionsPage() {
  const {
    products,
    visibleCollections,
    tabCounts,
    isLoading,
    loadError,
    notice,
    setNotice,
    statusTab,
    setStatusTab,
    search,
    setSearch,
    isSubmitting,
    isUpdating,
    isAssigning,
    loadData,
    createNew,
    update,
    remove,
    assignProducts,
  } = useCollections();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [assigningCollection, setAssigningCollection] = useState(null);
  const [previewCollection, setPreviewCollection] = useState(null);

  async function handleCreate(values) {
    const ok = await createNew(values);
    if (ok) setIsCreateOpen(false);
    return ok;
  }

  async function handleEditSubmit(values) {
    if (!editingCollection) return false;
    const ok = await update(editingCollection.id, values);
    if (ok) setEditingCollection(null);
    return ok;
  }

  async function handleAssignSubmit(collectionId, productIds) {
    const ok = await assignProducts(collectionId, productIds);
    if (ok) setAssigningCollection(null);
    return ok;
  }

  if (isLoading) {
    return (
      <Card>
        <Space align="center" size={12}>
          <Spin />
          <Typography.Text>Loading collections...</Typography.Text>
        </Space>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <Alert
          type="error"
          showIcon
          message="Unable to load collections"
          description={loadError}
          action={
            <Button size="small" onClick={loadData}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

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
          Collections
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateOpen(true)}
        >
          Create collection
        </Button>
      </div>

      {notice.message && (
        <Alert
          type={notice.type}
          message={notice.message}
          showIcon
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setNotice({ type: "", message: "" })}
        />
      )}

      <Card bodyStyle={{ padding: 0 }}>
        <CollectionsFilterBar
          statusTab={statusTab}
          onStatusTabChange={setStatusTab}
          tabCounts={tabCounts}
          search={search}
          onSearchChange={setSearch}
        />

        {visibleCollections.length === 0 ? (
          <div style={{ padding: 48 }}>
            <Empty
              description={
                <Space direction="vertical" size={4}>
                  <Typography.Text strong>No collections yet</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    Create collections to group products for your storefront.
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
                Create collection
              </Button>
            </Empty>
          </div>
        ) : (
          <CollectionsTable
            collections={visibleCollections}
            onEdit={setEditingCollection}
            onAssign={setAssigningCollection}
            onPreview={setPreviewCollection}
            onDelete={remove}
          />
        )}
      </Card>

      <CollectionFormModal
        mode="create"
        open={isCreateOpen}
        collection={null}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
        onCancel={() => setIsCreateOpen(false)}
      />

      <CollectionFormModal
        mode="edit"
        open={Boolean(editingCollection)}
        collection={editingCollection}
        isSubmitting={isUpdating}
        onSubmit={handleEditSubmit}
        onCancel={() => setEditingCollection(null)}
      />

      <AssignProductsModal
        collection={assigningCollection}
        products={products}
        isSaving={isAssigning}
        onSubmit={handleAssignSubmit}
        onCancel={() => setAssigningCollection(null)}
      />

      <CollectionPreviewModal
        collection={previewCollection}
        products={products}
        onClose={() => setPreviewCollection(null)}
      />
    </section>
  );
}
