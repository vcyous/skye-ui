/**
 * campaignService — Marketing campaign lifecycle, coupon linking, and analytics
 *
 * Domain: Marketing
 * Feature: 06
 * Depends on: supabaseClient, utils/errorUtils, storeService, discountService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError, isMissingTableError, isMissingColumnError } from "./utils/errorUtils.js";
import { getStoreContext } from "./storeService.js";
import { listDiscountRows } from "./discountService.js";

const MARKETING_CAMPAIGN_STATUSES = new Set([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);

function normalizeCampaignStatus(value) {
  const status = String(value || "draft")
    .trim()
    .toLowerCase();
  return MARKETING_CAMPAIGN_STATUSES.has(status) ? status : "draft";
}

function getCampaignTrendDays(days = 14) {
  const values = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const day = date.toISOString().slice(0, 10);
    values.push({
      day,
      visits: 0,
      conversions: 0,
      revenue: 0,
    });
  }
  return values;
}

function mapMarketingCampaign(row = {}, coupons = []) {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal || "",
    channel: row.channel || "other",
    status: normalizeCampaignStatus(row.status),
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    attributionMetadata: row.attribution_metadata_json || {},
    budgetAmount: Number(row.budget_amount || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    coupons,
  };
}

async function listCampaignRows(storeId, status = "all") {
  let query = supabase
    .from("marketing_campaigns")
    .select(
      "id, name, goal, channel, status, starts_at, ends_at, attribution_metadata_json, budget_amount, created_at, updated_at",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", normalizeCampaignStatus(status));
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "marketing_campaigns")) {
      return [];
    }
    throw normalizeError(error);
  }

  return data || [];
}

async function listCampaignCoupons(storeId, campaignIds = []) {
  if (!campaignIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("discounts")
    .select("id, code, title, status, uses_count, max_uses, campaign_id")
    .eq("store_id", storeId)
    .in("campaign_id", campaignIds);

  if (error) {
    if (isMissingColumnError(error, "campaign_id")) {
      return [];
    }
    throw normalizeError(error);
  }

  return data || [];
}

export async function getMarketingCampaigns(status = "all") {
  const { store } = await getStoreContext();
  const campaigns = await listCampaignRows(store.id, status);
  const campaignIds = campaigns.map((item) => item.id);
  const coupons = await listCampaignCoupons(store.id, campaignIds);

  const couponMap = coupons.reduce((acc, item) => {
    const bucket = acc.get(item.campaign_id) || [];
    bucket.push({
      id: item.id,
      code: item.code,
      title: item.title,
      status: item.status,
      usesCount: Number(item.uses_count || 0),
      maxUses: item.max_uses,
    });
    acc.set(item.campaign_id, bucket);
    return acc;
  }, new Map());

  return campaigns.map((item) =>
    mapMarketingCampaign(item, couponMap.get(item.id) || []),
  );
}

export async function createMarketingCampaign(payload = {}) {
  const { store } = await getStoreContext();
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Campaign name is required");
  }

  const { error } = await supabase.from("marketing_campaigns").insert({
    store_id: store.id,
    name,
    goal: payload.goal || null,
    channel: payload.channel || "other",
    status: normalizeCampaignStatus(payload.status),
    starts_at: payload.startsAt || null,
    ends_at: payload.endsAt || null,
    attribution_metadata_json: payload.attributionMetadata || {},
    budget_amount: payload.budgetAmount ? Number(payload.budgetAmount) : null,
  });

  if (error) {
    if (isMissingTableError(error, "marketing_campaigns")) {
      throw new Error(
        "Marketing campaigns schema missing. Run Feature 14 migration first.",
      );
    }
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateMarketingCampaign(campaignId, payload = {}) {
  if (!campaignId) {
    throw new Error("Campaign id is required");
  }

  const { store } = await getStoreContext();
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Campaign name is required");
  }

  const { error } = await supabase
    .from("marketing_campaigns")
    .update({
      name,
      goal: payload.goal || null,
      channel: payload.channel || "other",
      status: normalizeCampaignStatus(payload.status),
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      attribution_metadata_json: payload.attributionMetadata || {},
      budget_amount: payload.budgetAmount ? Number(payload.budgetAmount) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function setMarketingCampaignStatus(campaignId, nextStatus) {
  if (!campaignId) {
    throw new Error("Campaign id is required");
  }

  const { store } = await getStoreContext();
  const status = normalizeCampaignStatus(nextStatus);

  const { error } = await supabase
    .from("marketing_campaigns")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function linkCampaignCoupons(campaignId, discountIds = []) {
  if (!campaignId) {
    throw new Error("Campaign id is required");
  }

  const { store } = await getStoreContext();
  const selectedIds = Array.from(
    new Set((discountIds || []).map((item) => String(item || "").trim())),
  ).filter(Boolean);

  const { data: currentlyLinked, error: currentError } = await supabase
    .from("discounts")
    .select("id")
    .eq("store_id", store.id)
    .eq("campaign_id", campaignId);

  if (currentError) {
    if (isMissingColumnError(currentError, "campaign_id")) {
      throw new Error(
        "Discount campaign linkage column missing. Run Feature 14 migration first.",
      );
    }
    throw normalizeError(currentError);
  }

  const linkedIds = (currentlyLinked || []).map((item) => item.id);
  const toUnlink = linkedIds.filter((id) => !selectedIds.includes(id));

  if (toUnlink.length) {
    const { error: unlinkError } = await supabase
      .from("discounts")
      .update({ campaign_id: null, updated_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .in("id", toUnlink);

    if (unlinkError) {
      throw normalizeError(unlinkError);
    }
  }

  if (selectedIds.length) {
    const { error: linkError } = await supabase
      .from("discounts")
      .update({ campaign_id: campaignId, updated_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .in("id", selectedIds);

    if (linkError) {
      throw normalizeError(linkError);
    }
  }

  return { ok: true };
}

export async function getMarketingCampaignAnalytics(status = "all") {
  const { store } = await getStoreContext();
  const campaigns = await getMarketingCampaigns(status);
  const discountRows = await listDiscountRows(store.id, "all");
  const linkedDiscounts = discountRows.filter((item) => item.campaign_id);

  const totalCouponUses = linkedDiscounts.reduce(
    (sum, item) => sum + Number(item.uses_count || 0),
    0,
  );

  const trend = getCampaignTrendDays(14);
  const trendMap = trend.reduce((acc, item) => {
    acc.set(item.day, item);
    return acc;
  }, new Map());

  let visits = 0;
  let conversions = 0;
  let attributedRevenue = 0;

  const fromDate = trend[0]?.day;
  if (fromDate) {
    const { data: attributionEvents, error: attributionError } = await supabase
      .from("campaign_attribution_events")
      .select("event_type, event_at, order_amount")
      .eq("store_id", store.id)
      .gte("event_at", `${fromDate}T00:00:00.000Z`)
      .order("event_at", { ascending: true });

    if (
      attributionError &&
      !isMissingTableError(attributionError, "campaign_attribution_events")
    ) {
      throw normalizeError(attributionError);
    }

    for (const event of attributionEvents || []) {
      const day = String(event.event_at || "").slice(0, 10);
      const row = trendMap.get(day);
      if (!row) {
        continue;
      }

      const eventType = String(event.event_type || "").toLowerCase();
      if (eventType === "visit") {
        row.visits += 1;
        visits += 1;
      }

      if (eventType === "conversion" || eventType === "coupon_redeem") {
        row.conversions += 1;
        row.revenue += Number(event.order_amount || 0);
        conversions += 1;
        attributedRevenue += Number(event.order_amount || 0);
      }
    }
  }

  return {
    summary: {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((item) => item.status === "active")
        .length,
      pausedCampaigns: campaigns.filter((item) => item.status === "paused")
        .length,
      linkedCoupons: linkedDiscounts.length,
      totalCouponUses,
      attributedRevenue: Number(attributedRevenue.toFixed(2)),
      conversionRate: Number(
        (visits > 0 ? (conversions / visits) * 100 : 0).toFixed(2),
      ),
    },
    trend,
  };
}
