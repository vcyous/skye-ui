export const FULFILLMENT_STATUS_BADGE = {
  fulfilled: "success",
  unfulfilled: "warning",
  partial: "processing",
  shipped: "processing",
};

export const CARRIER_OPTIONS = [
  { value: "JNE", label: "JNE" },
  { value: "J&T", label: "J&T Express" },
  { value: "SiCepat", label: "SiCepat" },
  { value: "Anteraja", label: "Anteraja" },
  { value: "Pos Indonesia", label: "Pos Indonesia" },
  { value: "other", label: "Other" },
];

export const TIMELINE_COLOR_BY_STATUS = {
  shipped: "green",
  delivered: "blue",
  cancelled: "red",
};
