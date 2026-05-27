import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  useEffect(() => {
    if (!loadError) return;
    toast.error("Unable to load collections", { description: loadError });
  }, [loadError]);

  useEffect(() => {
    if (!notice.message) return;
    const fn = notice.type === "error" ? toast.error : toast.success;
    fn(notice.message);
    setNotice({});
  }, [notice.message, notice.type]);

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
        <CardContent className="flex items-center gap-3 pt-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading collections...</span>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm text-destructive">Unable to load collections</p>
          <Button size="sm" variant="outline" onClick={loadData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-0">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xl font-semibold">Collections</h4>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Create collection
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <CollectionsFilterBar
          statusTab={statusTab}
          onStatusTabChange={setStatusTab}
          tabCounts={tabCounts}
          search={search}
          onSearchChange={setSearch}
        />

        {visibleCollections.length === 0 ? (
          <div className="grid place-items-center p-12 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <p className="font-medium text-foreground">No collections yet</p>
              <p className="text-sm">
                Create collections to group products for your storefront.
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="size-4 mr-2" />
                Create collection
              </Button>
            </div>
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
