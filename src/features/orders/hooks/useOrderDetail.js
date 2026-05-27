import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addOrderInternalNote,
  createShipment,
  getOrderDetail,
  getOrderFulfillmentItems,
  updateOrderLifecycleState,
} from "../../../services/api";

function readErrorMessage(err, fallback) {
  return err instanceof Error ? err.message : fallback;
}

export function useOrderDetail(orderId) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [fulfillmentItems, setFulfillmentItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isShipping, setIsShipping] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const [orderData, fulfillment] = await Promise.all([
        getOrderDetail(orderId),
        getOrderFulfillmentItems(orderId),
      ]);
      setState({ loading: false, data: orderData, error: "" });
      setFulfillmentItems(fulfillment);
    } catch (err) {
      setState({
        loading: false,
        data: null,
        error: readErrorMessage(err, "Failed to load order."),
      });
    }
  }, [orderId]);

  useEffect(() => {
    setState({ loading: true, data: null, error: "" });
    loadOrder();
  }, [loadOrder]);

  const applyLifecyclePatch = useCallback(
    async (patch) => {
      setIsSaving(true);
      try {
        await updateOrderLifecycleState(orderId, patch);
        await loadOrder();
        toast.success("Order updated.");
      } catch (err) {
        toast.error(readErrorMessage(err, "Failed to update order."));
      } finally {
        setIsSaving(false);
      }
    },
    [orderId, loadOrder],
  );

  const submitInternalNote = useCallback(
    async (text) => {
      const trimmed = String(text || "").trim();
      if (!trimmed) return false;
      setIsSaving(true);
      try {
        await addOrderInternalNote(orderId, trimmed);
        await loadOrder();
        toast.success("Note added.");
        return true;
      } catch (err) {
        toast.error(readErrorMessage(err, "Failed to add note."));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [orderId, loadOrder],
  );

  const createShipmentForRemaining = useCallback(
    async (values) => {
      if (!orderId) return false;
      setIsShipping(true);
      try {
        const unshipped = fulfillmentItems.filter((item) => item.remainingQty > 0);
        await createShipment({
          orderId,
          carrier: values.carrier,
          trackingNumber: values.trackingNumber,
          note: values.note,
          items: unshipped.map((item) => ({
            orderItemId: item.id,
            quantity: item.remainingQty,
          })),
        });
        await loadOrder();
        toast.success("Shipment created.");
        return true;
      } catch (err) {
        toast.error(readErrorMessage(err, "Failed to create shipment."));
        return false;
      } finally {
        setIsShipping(false);
      }
    },
    [orderId, fulfillmentItems, loadOrder],
  );

  return {
    state,
    fulfillmentItems,
    isSaving,
    isShipping,
    loadOrder,
    applyLifecyclePatch,
    submitInternalNote,
    createShipmentForRemaining,
  };
}
