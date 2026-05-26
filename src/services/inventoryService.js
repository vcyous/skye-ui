export async function getInventoryItems() {
  return [];
}

export async function getInventoryMovements() {
  return [];
}

export async function getLowStockAlerts() {
  return [];
}

export async function adjustInventory() {
  return null;
}

export async function recordStockMovement() {
  return null;
}

export async function syncInventoryLevelSnapshot() {
  return null;
}

export async function importInventoryCsv() {
  return { imported: 0, errors: [] };
}

export async function exportInventoryCsv() {
  return "";
}
