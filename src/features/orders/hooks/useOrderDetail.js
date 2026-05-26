import { App } from "antd";
import { useCallback, useEffect, useState } from "react";
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
  const { message } = App.useApp();
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
        message.success("Order updated.");
      } catch (err) {
        message.error(readErrorMessage(err, "Failed to update order."));
      } finally {
        setIsSaving(false);
      }
    },
    [orderId, loadOrder, message],
  );

  const submitInternalNote = useCallback(
    async (text) => {
      const trimmed = String(text || "").trim();
      if (!trimmed) return false;
      setIsSaving(true);
      try {
        await addOrderInternalNote(orderId, trimmed);
        await loadOrder();
        message.success("Note added.");
        return true;
      } catch (err) {
        message.error(readErrorMessage(err, "Failed to add note."));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [orderId, loadOrder, message],
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
        message.success("Shipment created.");
        return true;
      } catch (err) {
        message.error(readErrorMessage(err, "Failed to create shipment."));
        return false;
      } finally {
        setIsShipping(false);
      }
    },
    [orderId, fulfillmentItems, loadOrder, message],
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
