export { setAccessToken, setAuthFailureHandler } from "./authTokenUtils";

export { sendEmail } from "./emailService";
export {
  supabase as api,
  assertSupabaseConfigured,
  isSupabaseConfigured,
  supabase,
} from "./supabaseClient";

export {
  assertUniqueHandle,
  buildUniqueHandle,
  isMissingColumnError,
  isMissingTableError,
  normalizeError,
  normalizeSeoHandle,
  parseSimpleCsv,
  slugify,
  tableExists,
  toCsvValue,
  validateSeoMetadataFields,
} from "./utils";

export {
  fetchProfile,
  loginRequest,
  logoutRequest,
  refreshAccessToken,
  refreshSession,
  registerRequest,
  requestPasswordReset,
  resetPasswordRequest,
  signin,
  signout,
  signup,
  updateProfile,
} from "./authService";

export {
  completeOnboarding,
  createInvoiceNumber,
  createOrderNumber,
  createRmaNumber,
  ensureAppUser,
  getCurrentAuthUser,
  getStoreContext,
  getStoreProfile,
  getTemplates,
  mapPublicUser,
  mapStoreSummary,
  toggleStorePublish,
  updateStoreBranding,
  updateStoreProfile,
} from "./storeService";

export {
  activateTemplate,
  DEFAULT_CATALOG_CONFIG,
  getActiveTheme,
  getCatalogOptions,
  getProductsForPreview,
  saveThemeConfig,
  uploadProductImage,
  uploadStoreAsset,
} from "./websiteBuilderService";

export {
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "./productService";

export {
  createCollection,
  deleteCollection,
  getCollections,
  updateCollection,
  updateCollectionProducts,
} from "./collectionService";

export {
  createShipment,
  createShippingMethod,
  createShippingZone,
  deleteShippingMethod,
  deleteShippingZone,
  getOrderFulfillmentItems,
  getShipments,
  getShippingMethods,
  getShippingZones,
  updateShipmentStatus,
  updateShippingMethod,
  updateShippingZone,
} from "./shippingService";

export {
  addOrderInternalNote,
  createOrderFromCart,
  getOrderDetail,
  getOrderLifecycleOptions,
  getOrders,
  updateOrderLifecycleState,
  updateOrderStatus,
} from "./orderService";

export {
  addToCart,
  ensureActiveCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
} from "./cartService";

export {
  getCheckoutRecoveryState,
  getCheckoutSnapshot,
  revalidateCheckout,
  saveCheckoutRecoveryState,
} from "./checkoutService";

export { getDashboardSummary } from "./analyticsService";

export {
  getCurrencySettings,
  normalizeCurrencyCode,
  roundCurrencyAmount,
  SUPPORTED_CURRENCIES,
} from "./currencyService";

export {
  getLocalizationSettings,
  getLocalizationTranslations,
  normalizeLocaleCode,
  recordLocalizationFallbackEvent,
  SUPPORTED_LOCALES,
  updateLocalizationSettings,
} from "./localizationService";
