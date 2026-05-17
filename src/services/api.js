/**
 * api.js — Barrel re-export for all Skye service modules
 *
 * This file exists solely for backward compatibility with page imports.
 * Do not add business logic here. Add it to the appropriate service file.
 */

export { setAccessToken, setAuthFailureHandler } from "./authTokenUtils.js";
export {
  supabase as api,
  assertSupabaseConfigured,
  supabase,
} from "./supabaseClient.js";

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
} from "./utils/index.js";

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
} from "./authService.js";

export {
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
  updateStoreBranding,
  updateStoreProfile,
} from "./storeService.js";

export {
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "./productService.js";

export {
  createCollection,
  deleteCollection,
  evaluateCollectionRuleMatch,
  getCollections,
  updateCollection,
  updateCollectionProducts,
  validateCollectionRules,
} from "./collectionService.js";

export {
  createContentPage,
  deleteContentPage,
  getContentPagePreview,
  getContentPages,
  getSeoOverview,
  publishContentPage,
  updateContentPage,
} from "./contentService.js";

export {
  adjustInventory,
  exportInventoryCsv,
  getInventoryItems,
  getInventoryMovements,
  getLowStockAlerts,
  importInventoryCsv,
} from "./inventoryService.js";

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
} from "./discountService.js";

export {
  createMarketingCampaign,
  deleteMarketingCampaign,
  getMarketingCampaignAnalytics,
  getMarketingCampaigns,
  linkCampaignCoupons,
  setMarketingCampaignStatus,
  updateMarketingCampaign,
} from "./campaignService.js";

export {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getTransactions,
  getTransactionStatusOptions,
  updatePaymentMethod,
  updateTransactionStatus,
} from "./paymentService.js";

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
} from "./shippingService.js";

export {
  createTaxRule,
  deleteTaxRule,
  getTaxRules,
  normalizeTaxBehavior,
  resolveMatchingTaxRule,
  resolveTaxPricing,
  updateTaxRule,
} from "./taxService.js";

export { getInvoices } from "./invoiceService.js";

export {
  createReturnRequest,
  getRefunds,
  getReturns,
  getReturnStatusOptions,
  processRefund,
  updateReturnStatus,
} from "./returnsService.js";

export {
  addOrderInternalNote,
  createOrderFromCart,
  getOrderDetail,
  getOrderLifecycleOptions,
  getOrders,
  updateOrderLifecycleState,
  updateOrderStatus,
} from "./orderService.js";

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
} from "./customerService.js";

export {
  createSubscription,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlans,
  getSubscriptions,
  processRecurringSubscriptionBilling,
  updateSubscriptionPlan,
  updateSubscriptionStatus,
} from "./subscriptionService.js";

export {
  addToCart,
  ensureActiveCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
} from "./cartService.js";

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
} from "./abandonedCartService.js";

export {
  getCheckoutRecoveryState,
  getCheckoutSnapshot,
  revalidateCheckout,
  saveCheckoutRecoveryState,
} from "./checkoutService.js";

export {
  addUtcDays,
  calculateDeltaPercent,
  getAnalyticsMetricDictionary,
  getAnalyticsOverviewReport,
  getDashboardSummary,
  invalidateAnalyticsReportCache,
  startOfUtcDay,
} from "./analyticsService.js";

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
} from "./currencyService.js";

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
} from "./localizationService.js";

export * from "./auditService.js";
export * from "./automationService.js";
export * from "./b2bWholesaleService.js";
export * from "./integrationService.js";
export * from "./webhookService.js";
