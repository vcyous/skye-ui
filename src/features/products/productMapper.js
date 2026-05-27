function parseTagsString(value) {
  if (Array.isArray(value)) return value.map((t) => t.trim()).filter(Boolean);
  return String(value || "").split(",").map((t) => t.trim()).filter(Boolean);
}

function toNullableNumber(value) {
  return value == null || value === "" ? null : Number(value);
}

export function toProductPayload(values, mediaUrls) {
  return {
    name: values.name,
    description: values.description || null,
    price: Number(values.price || 0),
    compareAtPrice: toNullableNumber(values.compareAtPrice),
    category: values.category || null,
    tags: parseTagsString(values.tags),
    status: values.status || "draft",
    stock: Number(values.stock || 0),
    mediaUrls: mediaUrls || [],
  };
}

export function toProductFormValues(product) {
  if (!product) return {};
  return {
    name: product.name || "",
    description: product.description || "",
    price: Number(product.price || 0),
    compareAtPrice: product.compare_at_price != null ? Number(product.compare_at_price) : "",
    category: product.category || "",
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : (product.tags || ""),
    status: product.status || "draft",
    stock: Number(product.stock || 0),
  };
}
