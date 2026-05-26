const RETURN_STATUSES = ["pending", "approved", "rejected", "received", "refunded"];

export function normalizeReturnStatus(value) {
  const status = String(value || "pending").trim().toLowerCase();
  return RETURN_STATUSES.includes(status) ? status : "pending";
}

export function getReturnStatusOptions() {
  return RETURN_STATUSES.slice();
}

export async function getReturns() {
  return [];
}

export async function createReturnRequest() {
  return null;
}

export async function updateReturnStatus() {
  return null;
}

export async function getRefunds() {
  return [];
}

export async function processRefund() {
  return null;
}
