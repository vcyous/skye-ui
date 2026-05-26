export async function getPaymentMethods() {
  return [];
}

export async function createPaymentMethod() {
  return null;
}

export async function updatePaymentMethod() {
  return null;
}

export async function deletePaymentMethod() {
  return null;
}

export async function getTransactions() {
  return [];
}

export function getTransactionStatusOptions() {
  return ["pending", "authorized", "captured", "failed", "refunded"];
}

export async function updateTransactionStatus() {
  return null;
}

export async function createTransactionEvent() {
  return null;
}

export async function loadTransactionEventsByTransactionIds() {
  return [];
}
