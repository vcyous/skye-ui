export const STATUS_TABS = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Arsip" },
];

export const STATUS_LABEL = {
  active: "Aktif",
  draft: "Draft",
  archived: "Arsip",
};

export const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Arsip" },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "name_asc", label: "Nama A–Z" },
  { value: "price_high", label: "Harga tertinggi" },
  { value: "price_low", label: "Harga terendah" },
  { value: "stock_high", label: "Stok terbanyak" },
];

export const BULK_STATUS_ACTIONS = [
  { key: "active", label: "Aktifkan", status: "active" },
  { key: "draft", label: "Jadikan Draft", status: "draft" },
  { key: "archived", label: "Arsipkan", status: "archived" },
];
