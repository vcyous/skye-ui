/**
 * B2B Wholesale API Service
 * Handles company management, buyer roles, wholesale pricing, and B2B order workflows
 */

import { getStoreContext, normalizeError, supabase } from "./api.js";

// ============================================================================
// COMPANY MANAGEMENT
// ============================================================================

export async function createB2bCompany(payload = {}) {
  const { store } = await getStoreContext();

  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Company name is required");
  }

  const handle = String(payload.handle || name)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data, error } = await supabase
    .from("b2b_companies")
    .insert({
      store_id: store.id,
      name,
      handle: handle || "company",
      email: payload.email || null,
      phone: payload.phone || null,
      website: payload.website || null,
      company_registration_no: payload.registrationNo || null,
      tax_id: payload.taxId || null,
      industry: payload.industry || null,
      employee_count: payload.employeeCount || null,
      annual_revenue: payload.annualRevenue ? Number(payload.annualRevenue) : null,
      description: payload.description || null,
      status: payload.status || "active",
      metadata_json: payload.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function getB2bCompanies(filters = {}) {
  const { store } = await getStoreContext();

  let query = supabase
    .from("b2b_companies")
    .select(
      "id, name, handle, email, phone, website, company_registration_no, tax_id, industry, employee_count, annual_revenue, description, status, created_at, updated_at"
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    const keyword = String(filters.search).toLowerCase();
    // Note: full-text search would require stored procedure or client-side filtering
    // For now, we rely on client-side filtering in the UI
  }

  const { data, error } = await query;

  if (error) {
    throw normalizeError(error);
  }

  return data.map(mapCompanyRecord);
}

export async function getB2bCompanyById(companyId) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("b2b_companies")
    .select("*")
    .eq("id", companyId)
    .eq("store_id", store.id)
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return mapCompanyRecord(data);
}

export async function updateB2bCompany(companyId, payload = {}) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { store } = await getStoreContext();

  const updates = {
    name: payload.name ? String(payload.name).trim() : undefined,
    email: payload.email || null,
    phone: payload.phone || null,
    website: payload.website || null,
    company_registration_no: payload.registrationNo || null,
    tax_id: payload.taxId || null,
    industry: payload.industry || null,
    employee_count: payload.employeeCount || null,
    annual_revenue: payload.annualRevenue ? Number(payload.annualRevenue) : null,
    description: payload.description || null,
    status: payload.status || undefined,
    metadata_json: payload.metadata || undefined,
    updated_at: new Date().toISOString(),
  };

  // Remove undefined values
  Object.keys(updates).forEach(
    (key) => updates[key] === undefined && delete updates[key]
  );

  const { error } = await supabase
    .from("b2b_companies")
    .update(updates)
    .eq("id", companyId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteB2bCompany(companyId) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { store } = await getStoreContext();

  const { error } = await supabase
    .from("b2b_companies")
    .delete()
    .eq("id", companyId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

// ============================================================================
// COMPANY LOCATIONS
// ============================================================================

export async function createCompanyLocation(companyId, payload = {}) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { data, error } = await supabase
    .from("company_locations")
    .insert({
      company_id: companyId,
      name: payload.name || "",
      address_line1: payload.addressLine1 || null,
      address_line2: payload.addressLine2 || null,
      city: payload.city || null,
      province_state: payload.provinceState || null,
      postal_code: payload.postalCode || null,
      country: payload.country || null,
      phone: payload.phone || null,
      email: payload.email || null,
      is_primary: Boolean(payload.isPrimary),
      is_billing_address: Boolean(payload.isBillingAddress),
      is_shipping_address: Boolean(payload.isShippingAddress),
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function getCompanyLocations(companyId) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { data, error } = await supabase
    .from("company_locations")
    .select("*")
    .eq("company_id", companyId)
    .order("is_primary", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return data.map(mapLocationRecord);
}

export async function updateCompanyLocation(locationId, payload = {}) {
  if (!locationId) {
    throw new Error("Location id is required");
  }

  const updates = {
    name: payload.name ? String(payload.name).trim() : undefined,
    address_line1: payload.addressLine1 || null,
    address_line2: payload.addressLine2 || null,
    city: payload.city || null,
    province_state: payload.provinceState || null,
    postal_code: payload.postalCode || null,
    country: payload.country || null,
    phone: payload.phone || null,
    email: payload.email || null,
    is_primary: payload.isPrimary !== undefined ? Boolean(payload.isPrimary) : undefined,
    is_billing_address: payload.isBillingAddress !== undefined ? Boolean(payload.isBillingAddress) : undefined,
    is_shipping_address: payload.isShippingAddress !== undefined ? Boolean(payload.isShippingAddress) : undefined,
    updated_at: new Date().toISOString(),
  };

  Object.keys(updates).forEach(
    (key) => updates[key] === undefined && delete updates[key]
  );

  const { error } = await supabase
    .from("company_locations")
    .update(updates)
    .eq("id", locationId);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

// ============================================================================
// BUYER ROLES & PERMISSIONS
// ============================================================================

export async function createCompanyBuyerRole(companyId, payload = {}) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Role name is required");
  }

  const { data, error } = await supabase
    .from("company_buyer_roles")
    .insert({
      company_id: companyId,
      name,
      description: payload.description || null,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      is_default: Boolean(payload.isDefault),
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function getCompanyBuyerRoles(companyId) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { data, error } = await supabase
    .from("company_buyer_roles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw normalizeError(error);
  }

  return data.map(mapRoleRecord);
}

export async function updateCompanyBuyerRole(roleId, payload = {}) {
  if (!roleId) {
    throw new Error("Role id is required");
  }

  const updates = {
    name: payload.name ? String(payload.name).trim() : undefined,
    description: payload.description || null,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : undefined,
    is_default: payload.isDefault !== undefined ? Boolean(payload.isDefault) : undefined,
    status: payload.status || undefined,
    updated_at: new Date().toISOString(),
  };

  Object.keys(updates).forEach(
    (key) => updates[key] === undefined && delete updates[key]
  );

  const { error } = await supabase
    .from("company_buyer_roles")
    .update(updates)
    .eq("id", roleId);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

// ============================================================================
// COMPANY BUYERS (Users in Company Accounts)
// ============================================================================

export async function createCompanyBuyer(companyId, payload = {}) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Buyer email is required");
  }

  const firstName = String(payload.firstName || "").trim();
  if (!firstName) {
    throw new Error("First name is required");
  }

  const { data, error } = await supabase
    .from("company_buyers")
    .insert({
      company_id: companyId,
      customer_id: payload.customerId || null,
      first_name: firstName,
      last_name: payload.lastName || null,
      email,
      phone: payload.phone || null,
      role_id: payload.roleId || null,
      is_admin: Boolean(payload.isAdmin),
      status: payload.status || "invited",
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function getCompanyBuyers(companyId) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { data, error } = await supabase
    .from("company_buyers")
    .select("*, company_buyer_roles(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return data.map(mapBuyerRecord);
}

export async function updateCompanyBuyer(buyerId, payload = {}) {
  if (!buyerId) {
    throw new Error("Buyer id is required");
  }

  const updates = {
    first_name: payload.firstName ? String(payload.firstName).trim() : undefined,
    last_name: payload.lastName || null,
    phone: payload.phone || null,
    role_id: payload.roleId || null,
    is_admin: payload.isAdmin !== undefined ? Boolean(payload.isAdmin) : undefined,
    status: payload.status || undefined,
    last_login_at: payload.lastLoginAt || undefined,
    updated_at: new Date().toISOString(),
  };

  Object.keys(updates).forEach(
    (key) => updates[key] === undefined && delete updates[key]
  );

  const { error } = await supabase
    .from("company_buyers")
    .update(updates)
    .eq("id", buyerId);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

// ============================================================================
// WHOLESALE PRICE LISTS
// ============================================================================

export async function createWholesalePriceList(payload = {}) {
  const { store } = await getStoreContext();

  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Price list name is required");
  }

  const { data, error } = await supabase
    .from("wholesale_price_lists")
    .insert({
      store_id: store.id,
      name,
      description: payload.description || null,
      currency_code: payload.currencyCode || "USD",
      pricing_type: payload.pricingType || "tier_based",
      is_default: Boolean(payload.isDefault),
      status: payload.status || "draft",
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function getWholesalePriceLists(filters = {}) {
  const { store } = await getStoreContext();

  let query = supabase
    .from("wholesale_price_lists")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw normalizeError(error);
  }

  return data.map(mapPriceListRecord);
}

export async function addProductToWholesalePriceList(
  priceListId,
  variantId,
  payload = {}
) {
  if (!priceListId || !variantId) {
    throw new Error("Price list id and variant id are required");
  }

  const basePrice = Number(payload.basePrice || 0);
  if (basePrice < 0) {
    throw new Error("Base price must be non-negative");
  }

  const { data, error } = await supabase
    .from("wholesale_price_list_products")
    .insert({
      price_list_id: priceListId,
      product_variant_id: variantId,
      base_price: basePrice,
      discount_percent: Number(payload.discountPercent || 0),
      tier_pricing_json: payload.tierPricing || {},
      min_order_qty: Math.max(1, Number(payload.minOrderQty || 1)),
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

// ============================================================================
// COMPANY CONTRACT PRICING
// ============================================================================

export async function createCompanyContractPrice(companyId, payload = {}) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  if (!payload.variantId) {
    throw new Error("Product variant id is required");
  }

  const contractPrice = Number(payload.contractPrice || 0);
  if (contractPrice < 0) {
    throw new Error("Contract price must be non-negative");
  }

  const { data, error } = await supabase
    .from("company_contract_prices")
    .insert({
      company_id: companyId,
      product_variant_id: payload.variantId,
      contract_price: contractPrice,
      min_order_qty: Math.max(1, Number(payload.minOrderQty || 1)),
      discount_percent: Number(payload.discountPercent || 0),
      is_exclusive: Boolean(payload.isExclusive),
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function getCompanyContractPrices(companyId) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { data, error } = await supabase
    .from("company_contract_prices")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return data.map(mapContractPriceRecord);
}

// ============================================================================
// B2B ORDER CONTRACTS
// ============================================================================

export async function createB2bOrderContract(companyId, payload = {}) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const contractNo = String(payload.contractNo || "").trim();
  if (!contractNo) {
    throw new Error("Contract number is required");
  }

  const { data, error } = await supabase
    .from("b2b_order_contracts")
    .insert({
      company_id: companyId,
      contract_no: contractNo,
      starts_at: payload.startsAt || new Date().toISOString(),
      ends_at: payload.endsAt || null,
      payment_terms: payload.paymentTerms || "net_30",
      payment_terms_days: Number(payload.paymentTermsDays || 30),
      credit_limit: payload.creditLimit ? Number(payload.creditLimit) : null,
      estimated_volume: payload.estimatedVolume ? Number(payload.estimatedVolume) : null,
      status: payload.status || "active",
      metadata_json: payload.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function getB2bOrderContracts(companyId) {
  if (!companyId) {
    throw new Error("Company id is required");
  }

  const { data, error } = await supabase
    .from("b2b_order_contracts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return data.map(mapOrderContractRecord);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapCompanyRecord(row) {
  return {
    id: row.id,
    name: row.name || "",
    handle: row.handle || "",
    email: row.email || "",
    phone: row.phone || "",
    website: row.website || "",
    registrationNo: row.company_registration_no || "",
    taxId: row.tax_id || "",
    industry: row.industry || "",
    employeeCount: row.employee_count || "",
    annualRevenue: row.annual_revenue ? Number(row.annual_revenue) : null,
    description: row.description || "",
    status: row.status || "active",
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLocationRecord(row) {
  return {
    id: row.id,
    name: row.name || "",
    addressLine1: row.address_line1 || "",
    addressLine2: row.address_line2 || "",
    city: row.city || "",
    provinceState: row.province_state || "",
    postalCode: row.postal_code || "",
    country: row.country || "",
    phone: row.phone || "",
    email: row.email || "",
    isPrimary: Boolean(row.is_primary),
    isBillingAddress: Boolean(row.is_billing_address),
    isShippingAddress: Boolean(row.is_shipping_address),
    status: row.status || "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoleRecord(row) {
  return {
    id: row.id,
    name: row.name || "",
    description: row.description || "",
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    isDefault: Boolean(row.is_default),
    status: row.status || "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBuyerRecord(row) {
  return {
    id: row.id,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    email: row.email || "",
    phone: row.phone || "",
    roleId: row.role_id || null,
    roleName: row.company_buyer_roles?.name || null,
    isAdmin: Boolean(row.is_admin),
    status: row.status || "active",
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPriceListRecord(row) {
  return {
    id: row.id,
    name: row.name || "",
    description: row.description || "",
    currencyCode: row.currency_code || "USD",
    pricingType: row.pricing_type || "tier_based",
    isDefault: Boolean(row.is_default),
    status: row.status || "draft",
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContractPriceRecord(row) {
  return {
    id: row.id,
    variantId: row.product_variant_id,
    contractPrice: Number(row.contract_price),
    minOrderQty: Number(row.min_order_qty),
    discountPercent: Number(row.discount_percent),
    isExclusive: Boolean(row.is_exclusive),
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderContractRecord(row) {
  return {
    id: row.id,
    contractNo: row.contract_no || "",
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    paymentTerms: row.payment_terms || "net_30",
    paymentTermsDays: Number(row.payment_terms_days),
    creditLimit: row.credit_limit ? Number(row.credit_limit) : null,
    estimatedVolume: row.estimated_volume ? Number(row.estimated_volume) : null,
    status: row.status || "active",
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
