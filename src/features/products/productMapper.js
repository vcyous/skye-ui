import dayjs from "dayjs";

function parseListString(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value) {
  return value == null || value === "" ? null : Number(value);
}

export function toProductPayload(values, mediaUrls) {
  return {
    ...values,
    price: Number(values.price),
    compareAtPrice: toNullableNumber(values.compareAtPrice),
    costPrice: toNullableNumber(values.costPrice),
    priceStartAt: values.priceStartAt ? values.priceStartAt.toISOString() : null,
    priceEndAt: values.priceEndAt ? values.priceEndAt.toISOString() : null,
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
    priceStartAt: product.priceStartAt ? dayjs(product.priceStartAt) : null,
    priceEndAt: product.priceEndAt ? dayjs(product.priceEndAt) : null,
    stock: Number(product.stock || 0),
  };
}
