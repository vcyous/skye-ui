import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createShipment,
  createShippingMethod,
  createShippingZone,
  deleteShippingMethod,
  deleteShippingZone,
  getOrderFulfillmentItems,
  getOrders,
  getShipments,
  getShippingMethods,
  getShippingZones,
  updateShipmentStatus,
  updateShippingMethod,
  updateShippingZone,
} from "../../../services/api";

function readErrorMessage(err, fallback) {
  return err instanceof Error ? err.message : fallback;
}

export function useShipping() {
  const [methods, setMethods] = useState([]);
  const [zones, setZones] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isSavingShipment, setIsSavingShipment] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [methodRows, zoneRows, shipmentRows, orderRows] = await Promise.all([
        getShippingMethods(),
        getShippingZones(),
        getShipments(),
        getOrders("semua_orders"),
      ]);
      setMethods(methodRows);
      setZones(zoneRows);
      setShipments(shipmentRows);
      setOrders(orderRows);
    } catch (err) {
      setLoadError(readErrorMessage(err, "Failed to load shipping data."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = useMemo(
    () => ({
      methods: methods.length,
      zones: zones.length,
      pending: shipments.filter((item) => item.status === "pending").length,
      activeShipments: shipments.filter((item) =>
        ["pending", "shipped"].includes(item.status),
      ).length,
    }),
    [methods, zones, shipments],
  );

  const buildHandler = (action, successMessage, failMessage) =>
    async (...args) => {
      setNotice({ type: "", message: "" });
      try {
        await action(...args);
        await loadData();
        setNotice({ type: "success", message: successMessage });
        return true;
      } catch (err) {
        setNotice({ type: "error", message: readErrorMessage(err, failMessage) });
        return false;
      }
    };

  const createMethod = useCallback(
    (values) => buildHandler(createShippingMethod, "Shipping method created.", "Failed to create shipping method.")(values),
    [loadData],
  );

  const updateMethod = useCallback(
    (id, values) => buildHandler(updateShippingMethod, "Shipping method updated.", "Failed to update shipping method.")(id, values),
    [loadData],
  );

  const removeMethod = useCallback(
    (record) => buildHandler(deleteShippingMethod, "Shipping method deleted.", "Failed to delete shipping method.")(record.id),
    [loadData],
  );

  const createZone = useCallback(
    (values) => buildHandler(createShippingZone, "Shipping zone created.", "Failed to create zone.")(values),
    [loadData],
  );

  const updateZone = useCallback(
    (id, values) => buildHandler(updateShippingZone, "Shipping zone updated.", "Failed to update zone.")(id, values),
    [loadData],
  );

  const removeZone = useCallback(
    (record) => buildHandler(deleteShippingZone, "Shipping zone deleted.", "Failed to delete zone.")(record.id),
    [loadData],
  );

  const setShipmentStatus = useCallback(
    (record, status) =>
      buildHandler(updateShipmentStatus, `Shipment marked ${status}.`, "Failed to update shipment.")(record.id, status),
    [loadData],
  );

  const createNewShipment = useCallback(
    async (payload) => {
      setNotice({ type: "", message: "" });
      setIsSavingShipment(true);
      try {
        await createShipment(payload);
        await loadData();
        setNotice({ type: "success", message: "Shipment created." });
        return true;
      } catch (err) {
        setNotice({
          type: "error",
          message: readErrorMessage(err, "Failed to create shipment."),
        });
        return false;
      } finally {
        setIsSavingShipment(false);
      }
    },
    [loadData],
  );

  const fetchFulfillmentItems = useCallback(async (orderId) => {
    try {
      return await getOrderFulfillmentItems(orderId);
    } catch (err) {
      setNotice({
        type: "error",
        message: readErrorMessage(err, "Failed to load fulfillment items."),
      });
      return [];
    }
  }, []);

  return {
    methods,
    zones,
    shipments,
    orders,
    isLoading,
    loadError,
    notice,
    setNotice,
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
  };
}
