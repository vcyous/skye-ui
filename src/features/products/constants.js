export const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "inactive", label: "Inactive" },
  { key: "archived", label: "Archived" },
];

export const STATUS_COLOR = {
  active: "success",
  draft: "default",
  inactive: "warning",
  archived: "default",
};

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "price_high", label: "Highest price" },
  { value: "price_low", label: "Lowest price" },
  { value: "stock_high", label: "Highest stock" },
];

export const BULK_STATUS_ACTIONS = [
  { key: "active", label: "Set as Active", status: "active" },
  { key: "draft", label: "Set as Draft", status: "draft" },
  { key: "archived", label: "Archive", status: "archived" },
];
