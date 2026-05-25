/**
 * api.ts — Barrel re-export for all Skye service modules
 *
 * This file exists solely for backward compatibility with page imports.
 * Do not add business logic here. Add it to the appropriate service file.
 */

export { setAccessToken, setAuthFailureHandler } from "./authTokenUtils";

export { sendEmail } from "./emailService";
export type { EmailPayload, EmailTemplate } from "./emailService";
export {
  supabase as api,
  assertSupabaseConfigured,
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

export type {
  CatalogConfig,
  CatalogOption,
  ThemeConfig,
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
  createContentPage,
  deleteContentPage,
  getContentPagePreview,
  getContentPages,
  getSeoOverview,
  publishContentPage,
  updateContentPage,
} from "./contentService";

export {
  adjustInventory,
  exportInventoryCsv,
  getInventoryItems,
  getInventoryMovements,
  getLowStockAlerts,
  importInventoryCsv,
} from "./inventoryService";

export {
  calculateDiscountAmount,
  createDiscount,
  deleteDiscount,
  getDiscounts,
  normalizeCodeList,
  previewDiscountOutcome,
  resolveApplicableDiscounts,
  updateDiscount,
  validateDiscountPayload,
} from "./discountService";

export {
  createMarketingCampaign,
  getMarketingCampaignAnalytics,
  getMarketingCampaigns,
  linkCampaignCoupons,
  setMarketingCampaignStatus,
  updateMarketingCampaign,
} from "./campaignService";

export {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getTransactions,
  getTransactionStatusOptions,
  updatePaymentMethod,
  updateTransactionStatus,
} from "./paymentService";

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
  createTaxRule,
  deleteTaxRule,
  getTaxRules,
  normalizeTaxBehavior,
  resolveMatchingTaxRule,
  resolveTaxPricing,
  updateTaxRule,
} from "./taxService";

export { getInvoices } from "./invoiceService";

export {
  createReturnRequest,
  getRefunds,
  getReturns,
  getReturnStatusOptions,
  processRefund,
  updateReturnStatus,
} from "./returnsService";

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
  addCustomerEngagementNote,
  createCustomer,
  createCustomerSegment,
  deleteCustomer,
  deleteCustomerSegment,
  evaluateCustomerSegmentFilter,
  getCustomers,
  getCustomerSegments,
  getCustomerTimeline,
  normalizeCustomerSegmentFilter,
  previewCustomerSegment,
  updateCustomer,
  updateCustomerSegment,
} from "./customerService";

export {
  createSubscription,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlans,
  getSubscriptions,
  processRecurringSubscriptionBilling,
  updateSubscriptionPlan,
  updateSubscriptionStatus,
} from "./subscriptionService";

export {
  addToCart,
  ensureActiveCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
} from "./cartService";

export {
  createRecoveryMessageTemplate,
  detectAbandonedCarts,
  getAbandonedCartPerformance,
  getAbandonedCartRecoveries,
  getRecoveryMessageTemplates,
  sendAbandonedCartRecoveryMessage,
  updateAbandonedCartMessageStatus,
  updateAbandonedCartRecoveryStatus,
  updateRecoveryMessageTemplate,
} from "./abandonedCartService";

export {
  getCheckoutRecoveryState,
  getCheckoutSnapshot,
  revalidateCheckout,
  saveCheckoutRecoveryState,
} from "./checkoutService";

export type {
  CheckoutRecoveryState,
  CheckoutSnapshot,
} from "./checkoutService";

export type { OrderDetail, OrderSummary } from "./orderService";

export {
  addUtcDays,
  calculateDeltaPercent,
  getAnalyticsMetricDictionary,
  getAnalyticsOverviewReport,
  getDashboardSummary,
  invalidateAnalyticsReportCache,
  startOfUtcDay,
} from "./analyticsService";

export {
  CURRENCY_MINOR_UNITS,
  getCurrencyConversionQuote,
  getCurrencyRateSnapshots,
  getCurrencySettings,
  normalizeCurrencyCode,
  roundCurrencyAmount,
  SUPPORTED_CURRENCIES,
  updateCurrencySettings,
  upsertCurrencyRateSnapshot,
} from "./currencyService";

export {
  deleteLocalizationTranslation,
  getLocalizationMissingTranslations,
  getLocalizationSettings,
  getLocalizationTranslations,
  normalizeLocaleCode,
  recordLocalizationFallbackEvent,
  SUPPORTED_LOCALES,
  updateLocalizationSettings,
  upsertLocalizationTranslation,
} from "./localizationService";

export * from "./auditService";
export * from "./automationService";
export * from "./b2bWholesaleService";
export * from "./integrationService";
export * from "./webhookService";
