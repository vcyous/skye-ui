import { getStoreContext, normalizeError, supabase } from "./api.js";

function mapIntegration(row) {
  return {
    id: row.id,
    integrationKey: row.integration_key,
    providerName: row.provider_name,
    displayName: row.display_name,
    category: row.category,
    status: row.status,
    isEnabled: Boolean(row.is_enabled),
    killSwitchEnabled: Boolean(row.kill_switch_enabled),
    credentialsMasked: row.credentials_masked_json || {},
    config: row.config_json || {},
    healthStatus: row.health_status,
    lastSyncedAt: row.last_synced_at || null,
    lastSuccessAt: row.last_success_at || null,
    lastErrorAt: row.last_error_at || null,
    lastErrorMessage: row.last_error_message || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSyncRun(row) {
  return {
    id: row.id,
    integrationId: row.integration_id,
    runType: row.run_type,
    status: row.status,
    attemptNo: Number(row.attempt_no || 1),
    maxRetries: Number(row.max_retries || 3),
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    recordsProcessed: Number(row.records_processed || 0),
    recordsSucceeded: Number(row.records_succeeded || 0),
    recordsFailed: Number(row.records_failed || 0),
    reconciliationSummary: row.reconciliation_summary_json || {},
    errorContext: row.error_context_json || {},
    errorMessage: row.error_message || "",
    createdAt: row.created_at,
  };
}

export async function getIntegrations(filters = {}) {
  const { store } = await getStoreContext();

  let query = supabase
    .from("integration_registry")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map(mapIntegration);
}

export async function createIntegration(payload = {}) {
  const { store } = await getStoreContext();
  const displayName = String(payload.displayName || "").trim();
  const integrationKey = String(payload.integrationKey || "").trim().toLowerCase();

  if (!displayName) {
    throw new Error("Display name is required");
  }
  if (!integrationKey) {
    throw new Error("Integration key is required");
  }

  const { data, error } = await supabase
    .from("integration_registry")
    .insert({
      store_id: store.id,
      integration_key: integrationKey,
      provider_name: payload.providerName || displayName,
      display_name: displayName,
      category: payload.category || "other",
      status: payload.isEnabled ? "active" : "inactive",
      is_enabled: Boolean(payload.isEnabled),
      kill_switch_enabled: false,
      credentials_masked_json: payload.credentialsMasked || {},
      credentials_ref: payload.credentialsRef || null,
      config_json: payload.config || {},
      health_status: "unknown",
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return { id: data.id, ok: true };
}

export async function updateIntegration(integrationId, payload = {}) {
  if (!integrationId) {
    throw new Error("Integration id is required");
  }

  const updates = {
    provider_name: payload.providerName,
    display_name: payload.displayName,
    category: payload.category,
    config_json: payload.config,
    credentials_masked_json: payload.credentialsMasked,
    credentials_ref: payload.credentialsRef,
    updated_at: new Date().toISOString(),
  };

  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) {
      delete updates[key];
    }
  });

  const { error } = await supabase
    .from("integration_registry")
    .update(updates)
    .eq("id", integrationId);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function setIntegrationEnabled(integrationId, enabled) {
  if (!integrationId) {
    throw new Error("Integration id is required");
  }

  const { error } = await supabase
    .from("integration_registry")
    .update({
      is_enabled: Boolean(enabled),
      status: enabled ? "active" : "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function setIntegrationKillSwitch(integrationId, enabled) {
  if (!integrationId) {
    throw new Error("Integration id is required");
  }

  const { error } = await supabase
    .from("integration_registry")
    .update({
      kill_switch_enabled: Boolean(enabled),
      status: enabled ? "disabled" : "degraded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function runIntegrationSync(integrationId, runType = "sync") {
  if (!integrationId) {
    throw new Error("Integration id is required");
  }

  const now = new Date().toISOString();

  const { data: runRow, error: runError } = await supabase
    .from("integration_sync_runs")
    .insert({
      integration_id: integrationId,
      run_type: runType,
      status: "running",
      started_at: now,
      attempt_no: 1,
      max_retries: 3,
      triggered_by: null,
    })
    .select("id")
    .single();

  if (runError) {
    throw normalizeError(runError);
  }

  const isSimulatedFailure = Math.random() < 0.15;
  const finishedAt = new Date().toISOString();

  const runUpdates = isSimulatedFailure
    ? {
        status: "failed",
        finished_at: finishedAt,
        records_processed: 0,
        records_succeeded: 0,
        records_failed: 0,
        error_message: "Simulated upstream timeout",
        error_context_json: { reason: "timeout", retryable: true },
        updated_at: finishedAt,
      }
    : {
        status: "succeeded",
        finished_at: finishedAt,
        records_processed: 20,
        records_succeeded: 20,
        records_failed: 0,
        reconciliation_summary_json: { imported: 8, exported: 12 },
        updated_at: finishedAt,
      };

  const { error: finishRunError } = await supabase
    .from("integration_sync_runs")
    .update(runUpdates)
    .eq("id", runRow.id);

  if (finishRunError) {
    throw normalizeError(finishRunError);
  }

  const integrationUpdates = isSimulatedFailure
    ? {
        health_status: "error",
        status: "degraded",
        last_error_at: finishedAt,
        last_error_message: "Simulated upstream timeout",
        updated_at: finishedAt,
      }
    : {
        health_status: "healthy",
        status: "active",
        last_synced_at: finishedAt,
        last_success_at: finishedAt,
        last_error_message: null,
        updated_at: finishedAt,
      };

  const { error: integrationError } = await supabase
    .from("integration_registry")
    .update(integrationUpdates)
    .eq("id", integrationId);

  if (integrationError) {
    throw normalizeError(integrationError);
  }

  return { ok: true, runId: runRow.id, status: runUpdates.status };
}

export async function getIntegrationSyncRuns(integrationId, limit = 20) {
  if (!integrationId) {
    return [];
  }

  const { data, error } = await supabase
    .from("integration_sync_runs")
    .select("*")
    .eq("integration_id", integrationId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, Number(limit || 20))));

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map(mapSyncRun);
}
