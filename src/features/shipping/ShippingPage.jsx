import { Alert, Button, Card, Spin, Typography } from "antd";
import { useState } from "react";
import CreateShipmentModal from "./components/CreateShipmentModal";
import MethodFormModal from "./components/MethodFormModal";
import MethodsSection from "./components/MethodsSection";
import ShipmentsSection from "./components/ShipmentsSection";
import ShippingMetrics from "./components/ShippingMetrics";
import ZoneFormModal from "./components/ZoneFormModal";
import ZonesSection from "./components/ZonesSection";
import { useShipping } from "./hooks/useShipping";

export default function ShippingPage() {
  const {
    methods,
    zones,
    shipments,
    orders,
    isLoading,
    loadError,
    notice,
    metrics,
    isSavingShipment,
    loadData,
    createMethod,
    updateMethod,
    removeMethod,
    createZone,
    updateZone,
    removeZone,
    setShipmentStatus,
    createNewShipment,
    fetchFulfillmentItems,
  } = useShipping();

  const [isCreateMethodOpen, setIsCreateMethodOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);

  async function handleCreateMethod(values) {
    const ok = await createMethod(values);
    if (ok) setIsCreateMethodOpen(false);
    return ok;
  }

  async function handleUpdateMethod(values) {
    if (!editingMethod) return false;
    const ok = await updateMethod(editingMethod.id, values);
    if (ok) setEditingMethod(null);
    return ok;
  }

  async function handleCreateZone(values) {
    const ok = await createZone(values);
    if (ok) setIsCreateZoneOpen(false);
    return ok;
  }

  async function handleUpdateZone(values) {
    if (!editingZone) return false;
    const ok = await updateZone(editingZone.id, values);
    if (ok) setEditingZone(null);
    return ok;
  }

  async function handleCreateShipment(payload) {
    const ok = await createNewShipment(payload);
    if (ok) setIsCreateShipmentOpen(false);
    return ok;
  }

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Shipping
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Manage shipping methods and create shipments for orders.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      {loadError ? (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={<Button onClick={loadData}>Retry</Button>}
        />
      ) : null}

      <ShippingMetrics metrics={metrics} />

      <MethodsSection
        methods={methods}
        onAdd={() => setIsCreateMethodOpen(true)}
        onCreateShipment={() => setIsCreateShipmentOpen(true)}
        onEdit={setEditingMethod}
        onDelete={removeMethod}
      />

      <ZonesSection
        zones={zones}
        onAdd={() => setIsCreateZoneOpen(true)}
        onEdit={setEditingZone}
        onDelete={removeZone}
      />

      <ShipmentsSection
        shipments={shipments}
        onStatusChange={setShipmentStatus}
      />

      <MethodFormModal
        mode="create"
        open={isCreateMethodOpen}
        method={null}
        zones={zones}
        onSubmit={handleCreateMethod}
        onCancel={() => setIsCreateMethodOpen(false)}
      />

      <MethodFormModal
        mode="edit"
        open={Boolean(editingMethod)}
        method={editingMethod}
        zones={zones}
        onSubmit={handleUpdateMethod}
        onCancel={() => setEditingMethod(null)}
      />

      <ZoneFormModal
        mode="create"
        open={isCreateZoneOpen}
        zone={null}
        onSubmit={handleCreateZone}
        onCancel={() => setIsCreateZoneOpen(false)}
      />

      <ZoneFormModal
        mode="edit"
        open={Boolean(editingZone)}
        zone={editingZone}
        onSubmit={handleUpdateZone}
        onCancel={() => setEditingZone(null)}
      />

      <CreateShipmentModal
        open={isCreateShipmentOpen}
        orders={orders}
        methods={methods}
        isSaving={isSavingShipment}
        fetchFulfillmentItems={fetchFulfillmentItems}
        onSubmit={handleCreateShipment}
        onCancel={() => setIsCreateShipmentOpen(false)}
      />
    </section>
  );
}
