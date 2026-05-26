export function normalizeTaxBehavior(value) {
  const behavior = String(value || "exclusive").trim().toLowerCase();
  return behavior === "inclusive" ? "inclusive" : "exclusive";
}

export async function getTaxRules() {
  return [];
}

export function resolveMatchingTaxRule() {
  return null;
}

export function resolveTaxPricing(subtotal) {
  const amount = Number(subtotal || 0);
  return {
    subtotal: amount,
    taxAmount: 0,
    taxRate: 0,
    totalWithTax: amount,
    behavior: "exclusive",
    matchedRule: null,
  };
}
