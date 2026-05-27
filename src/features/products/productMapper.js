function parseListString(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value) {
  return value == null || value === "" ? null : Number(value);
}

function datetimeLocalToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toProductPayload(values, mediaUrls) {
  return {
    ...values,
    price: Number(values.price),
    compareAtPrice: toNullableNumber(values.compareAtPrice),
    costPrice: toNullableNumber(values.costPrice),
    priceStartAt: datetimeLocalToIso(values.priceStartAt),
    priceEndAt: datetimeLocalToIso(values.priceEndAt),
    stock: Number(values.stock),
    tags: parseListString(values.tags),
    mediaUrls,
  };
}

export function toProductFormValues(product) {
  if (!product) return {};
  return {
    name: product.name,
    urlHandle: product.urlHandle || "",
    vendor: product.vendor || "",
    productType: product.productType || "",
    sku: product.sku,
    description: product.description || "",
    tags: (product.tags || []).join(", "),
    seoTitle: product.seoTitle || "",
    seoDescription: product.seoDescription || "",
    status: product.status,
    price: Number(product.price || 0),
    compareAtPrice: toNullableNumber(product.compareAtPrice),
    costPrice: toNullableNumber(product.costPrice),
    priceStartAt: isoToDatetimeLocal(product.priceStartAt),
    priceEndAt: isoToDatetimeLocal(product.priceEndAt),
    stock: Number(product.stock || 0),
  };
}
