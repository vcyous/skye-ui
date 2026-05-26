export const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
];

export const STATUS_OPTIONS = ["active", "draft", "inactive", "archived"].map(
  (value) => ({ value, label: value }),
);

export const COLLECTION_TYPE_OPTIONS = [
  { value: "manual", label: "Manual — add products one by one" },
  { value: "smart", label: "Automated — products added by conditions" },
];

export const RULE_FIELD_OPTIONS = [
  { value: "name", label: "Product name" },
  { value: "description", label: "Description" },
  { value: "vendor", label: "Vendor" },
  { value: "productType", label: "Product type" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
  { value: "sku", label: "SKU" },
  { value: "price", label: "Price" },
  { value: "stock", label: "Stock" },
];

export const RULE_OPERATOR_OPTIONS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "in", label: "in list" },
  { value: "not_in", label: "not in list" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
];

export const MATCH_MODE_OPTIONS = [
  { value: "all", label: "Products must match all conditions" },
  { value: "any", label: "Products must match any condition" },
];

export const DEFAULT_SMART_RULES = {
  match: "all",
  conditions: [{ field: "name", operator: "contains", value: "" }],
};
