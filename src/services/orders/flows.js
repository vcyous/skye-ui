export const ORDER_STATUS_FLOW = {
  pending: ["not_paid", "cancelled"],
  not_paid: ["need_ship", "cancelled", "failed_delivery"],
  need_ship: ["ongoing_shipped", "cancelled", "failed_delivery"],
  ongoing_shipped: ["receive", "failed_delivery"],
  failed_delivery: ["need_ship", "cancelled"],
  receive: [],
  cancelled: [],
};

export const PAYMENT_STATUS_FLOW = {
  pending: ["authorized", "paid", "failed", "cancelled"],
  authorized: ["paid", "failed", "refunded"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  failed: ["pending", "cancelled"],
  cancelled: [],
};

export const FULFILLMENT_STATUS_FLOW = {
  unfulfilled: ["partial", "shipped", "fulfilled", "cancelled"],
  partial: ["shipped", "fulfilled", "cancelled"],
  shipped: ["delivered", "failed"],
  fulfilled: ["delivered"],
  delivered: [],
  failed: ["shipped", "cancelled"],
  cancelled: [],
};

export function canTransition(flow, from, to) {
  const fromKey = String(from || "").toLowerCase();
  const toKey = String(to || "").toLowerCase();
  if (!toKey || toKey === fromKey) return true;
  return (flow[fromKey] || []).includes(toKey);
}
