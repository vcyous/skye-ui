export function calculateDiscountAmount() {
  return 0;
}

export function normalizeCodeList(value) {
  return Array.isArray(value)
    ? value.map((v) => String(v || "").trim()).filter(Boolean)
    : [];
}

export async function listDiscountRows() {
  return [];
}

export async function getDiscounts() {
  return [];
}

export async function resolveApplicableDiscounts() {
  return {
    discounts: [],
    totalDiscount: 0,
    breakdown: [],
  };
}
