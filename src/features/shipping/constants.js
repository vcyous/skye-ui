export const SHIPPING_TYPE_OPTIONS = [
  { value: "flat_rate", label: "Flat Rate" },
  { value: "weight_based", label: "Weight Based" },
  { value: "zone_based", label: "Zone Based" },
];

export const SHIPMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
];

export const SHIPMENT_STATUS_VALUES = SHIPMENT_STATUS_OPTIONS.map((o) => o.value);
