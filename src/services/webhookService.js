// Feature 23: Webhook and API Key Management Service
// Handles API credentials, webhook subscriptions, and delivery tracking

import { supabase } from '../api';

const API_SCOPES = [
  'read_products',
  'write_products',
  'read_orders',
  'write_orders',
  'read_customers',
  'write_customers',
  'read_inventory',
  'write_inventory',
  'read_webhooks',
  'write_webhooks',
];

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

export const createApiKey = async (storeId, payload) => {
  try {
    const keyPrefix = `sk_${Math.random().toString(36).substring(2, 10)}`;
    const keyHash = btoa(`${keyPrefix}${Date.now()}`);

    const { data, error } = await supabase
      .from('api_keys')
      .insert([
        {
          store_id: storeId,
          name: payload.name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes: payload.scopes || [],
          is_active: true,
          expires_at: payload.expiresAt || null,
          metadata: payload.metadata || {},
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      // Only return full key once on creation
      fullKey: `${keyPrefix}...${keyHash.substring(keyHash.length - 4)}`,
    };
  } catch (err) {
    console.error('Error creating API key:', err);
    throw err;
  }
};

export const getApiKeys = async (storeId, filters = {}) => {
  try {
    let query = supabase
      .from('api_keys')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(mapApiKeyRecord);
  } catch (err) {
    console.error('Error fetching API keys:', err);
    throw err;
  }
};

export const getApiKeyById = async (storeId, keyId) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('store_id', storeId)
      .single();

    if (error) throw error;

    return mapApiKeyRecord(data);
  } catch (err) {
    console.error('Error fetching API key:', err);
    throw err;
  }
};

export const updateApiKey = async (storeId, keyId, payload) => {
  try {
    const updateData = {
      name: payload.name,
      scopes: payload.scopes || [],
      is_active: payload.isActive !== undefined ? payload.isActive : true,
      expires_at: payload.expiresAt || null,
      metadata: payload.metadata || {},
    };

    const { data, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapApiKeyRecord(data);
  } catch (err) {
    console.error('Error updating API key:', err);
    throw err;
  }
};

export const rotateApiKey = async (storeId, keyId) => {
  try {
    const keyPrefix = `sk_${Math.random().toString(36).substring(2, 10)}`;
    const keyHash = btoa(`${keyPrefix}${Date.now()}`);

    const { data, error } = await supabase
      .from('api_keys')
      .update({
        key_prefix: keyPrefix,
        key_hash: keyHash,
        rotated_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...mapApiKeyRecord(data),
      fullKey: `${keyPrefix}...${keyHash.substring(keyHash.length - 4)}`,
    };
  } catch (err) {
    console.error('Error rotating API key:', err);
    throw err;
  }
};

export const deleteApiKey = async (storeId, keyId) => {
  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('store_id', storeId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error deleting API key:', err);
    throw err;
  }
};

// ============================================================================
// WEBHOOK ENDPOINT MANAGEMENT
// ============================================================================

export const createWebhookEndpoint = async (storeId, payload) => {
  try {
    const secretKey = `whsec_${Math.random().toString(36).substring(2, 20)}`;

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert([
        {
          store_id: storeId,
          name: payload.name,
          url: payload.url,
          is_active: true,
          secret_key: secretKey,
          api_version: payload.apiVersion || '2024-01',
          max_retries: payload.maxRetries || 5,
          timeout_seconds: payload.timeoutSeconds || 30,
          metadata: payload.metadata || {},
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapWebhookEndpointRecord(data);
  } catch (err) {
    console.error('Error creating webhook endpoint:', err);
    throw err;
  }
};

export const getWebhookEndpoints = async (storeId, filters = {}) => {
  try {
    let query = supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(mapWebhookEndpointRecord);
  } catch (err) {
    console.error('Error fetching webhook endpoints:', err);
    throw err;
  }
};

export const getWebhookEndpointById = async (storeId, endpointId) => {
  try {
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', endpointId)
      .eq('store_id', storeId)
      .single();

    if (error) throw error;

    return mapWebhookEndpointRecord(data);
  } catch (err) {
    console.error('Error fetching webhook endpoint:', err);
    throw err;
  }
};

export const updateWebhookEndpoint = async (storeId, endpointId, payload) => {
  try {
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update({
        name: payload.name,
        url: payload.url,
        is_active: payload.isActive !== undefined ? payload.isActive : true,
        api_version: payload.apiVersion || '2024-01',
        max_retries: payload.maxRetries || 5,
        timeout_seconds: payload.timeoutSeconds || 30,
        metadata: payload.metadata || {},
      })
      .eq('id', endpointId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapWebhookEndpointRecord(data);
  } catch (err) {
    console.error('Error updating webhook endpoint:', err);
    throw err;
  }
};

export const testWebhookEndpoint = async (storeId, endpointId) => {
  try {
    const endpoint = await getWebhookEndpointById(storeId, endpointId);

    // Simulate sending test webhook
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Test webhook delivery' },
    };

    const signature = btoa(JSON.stringify(testPayload) + endpoint.secretKey);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-SHA256': signature,
        'X-Shopify-Webhook-Id': `test_${Date.now()}`,
      },
      body: JSON.stringify(testPayload),
      timeout: endpoint.timeoutSeconds * 1000,
    }).catch(() => ({ status: 0 }));

    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status || 0,
      message: response.status === 0 ? 'Connection failed' : 'Test sent',
    };
  } catch (err) {
    console.error('Error testing webhook endpoint:', err);
    return {
      success: false,
      statusCode: 0,
      message: err.message || 'Test failed',
    };
  }
};

export const deleteWebhookEndpoint = async (storeId, endpointId) => {
  try {
    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', endpointId)
      .eq('store_id', storeId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error deleting webhook endpoint:', err);
    throw err;
  }
};

// ============================================================================
// WEBHOOK SUBSCRIPTION MANAGEMENT
// ============================================================================

export const createWebhookSubscription = async (storeId, payload) => {
  try {
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .insert([
        {
          store_id: storeId,
          endpoint_id: payload.endpointId,
          event_type: payload.eventType,
          topic: payload.topic || 'all',
          is_active: true,
          filters: payload.filters || {},
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapWebhookSubscriptionRecord(data);
  } catch (err) {
    console.error('Error creating webhook subscription:', err);
    throw err;
  }
};

export const getWebhookSubscriptions = async (storeId, endpointId) => {
  try {
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .eq('endpoint_id', endpointId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(mapWebhookSubscriptionRecord);
  } catch (err) {
    console.error('Error fetching webhook subscriptions:', err);
    throw err;
  }
};

export const deleteWebhookSubscription = async (storeId, subscriptionId) => {
  try {
    const { error } = await supabase
      .from('webhook_subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('store_id', storeId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error deleting webhook subscription:', err);
    throw err;
  }
};

// ============================================================================
// WEBHOOK DELIVERY AND LOGS
// ============================================================================

export const triggerWebhookEvent = async (storeId, subscriptionId, eventData) => {
  try {
    // Simulate triggering webhook with 10% failure rate for demo
    const willFail = Math.random() < 0.1;

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .insert([
        {
          store_id: storeId,
          subscription_id: subscriptionId,
          endpoint_id: eventData.endpointId,
          event_type: eventData.eventType,
          status: willFail ? 'failed' : 'succeeded',
          attempt_no: 1,
          max_retries: eventData.maxRetries || 5,
          http_status_code: willFail ? 500 : 200,
          response_body: willFail ? '{"error": "Internal server error"}' : '{"success": true}',
          error_message: willFail ? 'Endpoint returned error' : null,
          payload_signature: btoa(JSON.stringify(eventData) + Date.now()),
          payload_hash: btoa(JSON.stringify(eventData)),
          triggered_at: new Date().toISOString(),
          delivered_at: willFail ? null : new Date().toISOString(),
          next_retry_at: willFail ? new Date(Date.now() + 60000).toISOString() : null,
          metadata: eventData.metadata || {},
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapWebhookDeliveryRecord(data);
  } catch (err) {
    console.error('Error triggering webhook event:', err);
    throw err;
  }
};

export const getWebhookDeliveries = async (storeId, subscriptionId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('store_id', storeId)
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(mapWebhookDeliveryRecord);
  } catch (err) {
    console.error('Error fetching webhook deliveries:', err);
    throw err;
  }
};

export const getWebhookDeliveryById = async (storeId, deliveryId) => {
  try {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('store_id', storeId)
      .single();

    if (error) throw error;

    return mapWebhookDeliveryRecord(data);
  } catch (err) {
    console.error('Error fetching webhook delivery:', err);
    throw err;
  }
};

export const retryWebhookDelivery = async (storeId, deliveryId) => {
  try {
    const delivery = await getWebhookDeliveryById(storeId, deliveryId);

    if (delivery.attemptNo >= delivery.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    // Simulate retry with exponential backoff
    const willFail = Math.random() < 0.1;
    const backoffMs = Math.pow(2, delivery.attemptNo) * 30000;

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .update({
        status: willFail ? 'failed' : 'succeeded',
        attempt_no: delivery.attemptNo + 1,
        http_status_code: willFail ? 500 : 200,
        response_body: willFail ? '{"error": "Retry failed"}' : '{"success": true}',
        error_message: willFail ? 'Retry attempt failed' : null,
        delivered_at: willFail ? null : new Date().toISOString(),
        next_retry_at: willFail ? new Date(Date.now() + backoffMs).toISOString() : null,
      })
      .eq('id', deliveryId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapWebhookDeliveryRecord(data);
  } catch (err) {
    console.error('Error retrying webhook delivery:', err);
    throw err;
  }
};

// ============================================================================
// WEBHOOK EVENT TEMPLATES
// ============================================================================

export const getWebhookEventTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('webhook_event_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) throw error;

    return data.map(mapWebhookEventTemplate);
  } catch (err) {
    console.error('Error fetching webhook event templates:', err);
    throw err;
  }
};

// ============================================================================
// API EVENTS LOGGING
// ============================================================================

export const logApiEvent = async (storeId, payload) => {
  try {
    const { error } = await supabase
      .from('api_events')
      .insert([
        {
          store_id: storeId,
          api_key_id: payload.apiKeyId || null,
          event_type: payload.eventType,
          endpoint: payload.endpoint || null,
          method: payload.method || null,
          status_code: payload.statusCode || null,
          error_message: payload.errorMessage || null,
          ip_address: payload.ipAddress || null,
          user_agent: payload.userAgent || null,
          metadata: payload.metadata || {},
        },
      ]);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error logging API event:', err);
    throw err;
  }
};

export const getApiEvents = async (storeId, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('api_events')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(mapApiEventRecord);
  } catch (err) {
    console.error('Error fetching API events:', err);
    throw err;
  }
};

// ============================================================================
// DATA MAPPERS
// ============================================================================

const mapApiKeyRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  name: record.name,
  keyPrefix: record.key_prefix,
  scopes: record.scopes || [],
  isActive: record.is_active,
  lastUsedAt: record.last_used_at,
  rotatedAt: record.rotated_at,
  expiresAt: record.expires_at,
  metadata: record.metadata || {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapWebhookEndpointRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  name: record.name,
  url: record.url,
  isActive: record.is_active,
  secretKey: record.secret_key ? `${record.secret_key.substring(0, 8)}...` : null,
  apiVersion: record.api_version,
  maxRetries: record.max_retries,
  timeoutSeconds: record.timeout_seconds,
  metadata: record.metadata || {},
  lastTriggeredAt: record.last_triggered_at,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapWebhookSubscriptionRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  endpointId: record.endpoint_id,
  eventType: record.event_type,
  topic: record.topic,
  isActive: record.is_active,
  filters: record.filters || {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapWebhookDeliveryRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  subscriptionId: record.subscription_id,
  endpointId: record.endpoint_id,
  eventType: record.event_type,
  status: record.status,
  attemptNo: record.attempt_no,
  maxRetries: record.max_retries,
  httpStatusCode: record.http_status_code,
  responseBody: record.response_body,
  errorMessage: record.error_message,
  payloadSignature: record.payload_signature,
  payloadHash: record.payload_hash,
  triggeredAt: record.triggered_at,
  deliveredAt: record.delivered_at,
  nextRetryAt: record.next_retry_at,
  metadata: record.metadata || {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapWebhookEventTemplate = (record) => ({
  id: record.id,
  eventType: record.event_type,
  displayName: record.display_name,
  description: record.description,
  payloadSchema: record.payload_schema,
  examplePayload: record.example_payload,
  isActive: record.is_active,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapApiEventRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  apiKeyId: record.api_key_id,
  eventType: record.event_type,
  endpoint: record.endpoint,
  method: record.method,
  statusCode: record.status_code,
  errorMessage: record.error_message,
  ipAddress: record.ip_address,
  userAgent: record.user_agent,
  metadata: record.metadata || {},
  createdAt: record.created_at,
});

export const API_KEY_SCOPES = API_SCOPES;
