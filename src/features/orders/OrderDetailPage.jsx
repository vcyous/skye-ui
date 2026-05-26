import { Alert, Card, Col, Row, Space, Spin, Typography } from "antd";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { getOrderLifecycleOptions } from "../../services/api";
import CreateShipmentModal from "./components/detail/CreateShipmentModal";
import OrderAddressCard from "./components/detail/OrderAddressCard";
import OrderCustomerCard from "./components/detail/OrderCustomerCard";
import OrderHeader from "./components/detail/OrderHeader";
import OrderItemsCard from "./components/detail/OrderItemsCard";
import OrderMetaCard from "./components/detail/OrderMetaCard";
import OrderPaymentCard from "./components/detail/OrderPaymentCard";
import OrderShipmentsCard from "./components/detail/OrderShipmentsCard";
import OrderTimelineCard from "./components/detail/OrderTimelineCard";
import OrderTransactionsCard from "./components/detail/OrderTransactionsCard";
import { useOrderDetail } from "./hooks/useOrderDetail";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const {
    state,
    fulfillmentItems,
    isSaving,
    isShipping,
    applyLifecyclePatch,
    submitInternalNote,
    createShipmentForRemaining,
  } = useOrderDetail(orderId);

  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

  if (state.loading) {
    return (
      <Card>
        <Space>
          <Spin />
          <Typography.Text>Loading order...</Typography.Text>
        </Space>
      </Card>
    );
  }

  if (state.error) {
    return <Alert type="error" showIcon message={state.error} />;
  }

  const order = state.data;
  const lifecycleOptions = getOrderLifecycleOptions({
    status: order?.status,
    paymentStatus: order?.paymentStatus,
    fulfillmentStatus: order?.fulfillmentStatus,
  });
  const hasUnshipped = fulfillmentItems.some((item) => item.remainingQty > 0);

  async function handleCreateShipment(values) {
    const ok = await createShipmentForRemaining(values);
    if (ok) setIsShipmentModalOpen(false);
    return ok;
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <OrderHeader
        order={order}
        hasUnshipped={hasUnshipped}
        onCreateShipment={() => setIsShipmentModalOpen(true)}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <OrderItemsCard
            order={order}
            fulfillmentItems={fulfillmentItems}
            hasUnshipped={hasUnshipped}
          />

          <OrderPaymentCard
            order={order}
            lifecycleOptions={lifecycleOptions}
            isSaving={isSaving}
            onPatch={applyLifecyclePatch}
          />

          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={24} md={12}>
              <OrderShipmentsCard shipments={order?.shipments ?? []} />
            </Col>
            <Col xs={24} md={12}>
              <OrderTransactionsCard transactions={order?.transactions ?? []} />
            </Col>
          </Row>

          <OrderTimelineCard
            events={order?.timeline ?? []}
            isSaving={isSaving}
            onSubmitNote={submitInternalNote}
          />
        </Col>

        <Col xs={24} lg={8}>
          <OrderCustomerCard order={order} />
          <OrderAddressCard address={order?.shippingAddress} />
          <OrderMetaCard order={order} />
        </Col>
      </Row>

      <CreateShipmentModal
        open={isShipmentModalOpen}
        isShipping={isShipping}
        onSubmit={handleCreateShipment}
        onCancel={() => setIsShipmentModalOpen(false)}
      />
    </section>
  );
}
