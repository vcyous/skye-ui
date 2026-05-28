export { setAccessToken, setAuthFailureHandler } from "./authTokenUtils";
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
  ensureAppUser,
  getCurrentAuthUser,
  getStoreContext,
  mapPublicUser,
  mapStoreSummary,
} from "./storeService";

export { uploadProductImage, uploadStoreAsset } from "./websiteBuilderService";

export {
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "./productService";

