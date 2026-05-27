import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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

  useEffect(() => {
    if (state.error) {
      toast.error("Failed to load order", { description: state.error });
    }
  }, [state.error]);

  if (state.loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-muted-foreground">Loading order...</span>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    return null;
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
    <section className="grid gap-4">
      <OrderHeader
        order={order}
        hasUnshipped={hasUnshipped}
        onCreateShipment={() => setIsShipmentModalOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,_320px)] gap-4">
        <div className="flex flex-col gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <OrderShipmentsCard shipments={order?.shipments ?? []} />
            <OrderTransactionsCard transactions={order?.transactions ?? []} />
          </div>

          <OrderTimelineCard
            events={order?.timeline ?? []}
            isSaving={isSaving}
            onSubmitNote={submitInternalNote}
          />
        </div>

        <div className="flex flex-col gap-4">
          <OrderCustomerCard order={order} />
          <OrderAddressCard address={order?.shippingAddress} />
          <OrderMetaCard order={order} />
        </div>
      </div>

      <CreateShipmentModal
        open={isShipmentModalOpen}
        isShipping={isShipping}
        onSubmit={handleCreateShipment}
        onCancel={() => setIsShipmentModalOpen(false)}
      />
    </section>
  );
}
