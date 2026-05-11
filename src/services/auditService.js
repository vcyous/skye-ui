// Feature 25: Security Compliance and Audit Service
// Manages audit logging, role-based access control, and compliance tracking

import { supabase } from '../api';

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export const logAuditEvent = async (storeId, payload) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          store_id: storeId,
          user_id: payload.userId || null,
          event_type: payload.eventType,
          event_category: payload.eventCategory,
          entity_type: payload.entityType || null,
          entity_id: payload.entityId || null,
          action: payload.action,
          severity: payload.severity || 'info',
          source_ip: payload.sourceIp || null,
          user_agent: payload.userAgent || null,
          request_id: payload.requestId || null,
          changes: payload.changes || null,
          old_values: payload.oldValues || null,
          new_values: payload.newValues || null,
          status: payload.status || 'completed',
          error_message: payload.errorMessage || null,
          metadata: payload.metadata || {},
          is_compliant: payload.isCompliant !== false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapAuditLogRecord(data);
  } catch (err) {
    console.error('Error logging audit event:', err);
    throw err;
  }
};

export const getAuditLogs = async (storeId, filters = {}) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters.eventCategory) {
      query = query.eq('event_category', filters.eventCategory);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data, error } = await query.limit(filters.limit || 100);

    if (error) throw error;

    return data.map(mapAuditLogRecord);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    throw err;
  }
};

export const getAuditLogById = async (storeId, logId) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', logId)
      .eq('store_id', storeId)
      .single();

    if (error) throw error;

    return mapAuditLogRecord(data);
  } catch (err) {
    console.error('Error fetching audit log:', err);
    throw err;
  }
};

export const getAuditEventTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('audit_event_types')
      .select('*')
      .eq('is_active', true)
      .order('event_category', { ascending: true });

    if (error) throw error;

    return data.map(mapAuditEventTypeRecord);
  } catch (err) {
    console.error('Error fetching audit event types:', err);
    throw err;
  }
};

// ============================================================================
// ROLE AND PERMISSION MANAGEMENT
// ============================================================================

export const getRolesAndPermissions = async (storeId) => {
  try {
    const { data, error } = await supabase
      .from('roles_permissions')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_enabled', true)
      .order('role_name', { ascending: true });

    if (error) throw error;

    return data.map(mapRolePermissionRecord);
  } catch (err) {
    console.error('Error fetching roles and permissions:', err);
    throw err;
  }
};

export const getUserRoles = async (storeId, userId) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    return data.map(mapUserRoleRecord);
  } catch (err) {
    console.error('Error fetching user roles:', err);
    throw err;
  }
};

export const assignUserRole = async (storeId, userId, roleName) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert([
        {
          store_id: storeId,
          user_id: userId,
          role_name: roleName,
          assigned_by: null,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Log the role assignment
    await logAuditEvent(storeId, {
      eventType: 'role.assigned',
      eventCategory: 'security',
      action: 'assign',
      entityType: 'user_role',
      entityId: userId,
      newValues: { role_name: roleName },
    });

    return mapUserRoleRecord(data);
  } catch (err) {
    console.error('Error assigning user role:', err);
    throw err;
  }
};

export const revokeUserRole = async (storeId, userId, roleName) => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .eq('role_name', roleName);

    if (error) throw error;

    // Log the role revocation
    await logAuditEvent(storeId, {
      eventType: 'role.revoked',
      eventCategory: 'security',
      action: 'revoke',
      entityType: 'user_role',
      entityId: userId,
      oldValues: { role_name: roleName },
    });

    return { success: true };
  } catch (err) {
    console.error('Error revoking user role:', err);
    throw err;
  }
};

export const getStoreUsers = async (storeId) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role_name,
        assigned_at,
        is_active
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    // Group by user_id
    const userMap = {};
    data.forEach((row) => {
      if (!userMap[row.user_id]) {
        userMap[row.user_id] = {
          userId: row.user_id,
          roles: [],
          assignedAt: row.assigned_at,
        };
      }
      userMap[row.user_id].roles.push(row.role_name);
    });

    return Object.values(userMap);
  } catch (err) {
    console.error('Error fetching store users:', err);
    throw err;
  }
};

// ============================================================================
// SECURITY EVENTS
// ============================================================================

export const logSecurityEvent = async (storeId, payload) => {
  try {
    const { data, error } = await supabase
      .from('security_events')
      .insert([
        {
          store_id: storeId,
          user_id: payload.userId || null,
          event_type: payload.eventType,
          severity: payload.severity || 'info',
          description: payload.description || null,
          source_ip: payload.sourceIp || null,
          success: payload.success !== false,
          mfa_used: payload.mfaUsed || false,
          device_fingerprint: payload.deviceFingerprint || null,
          metadata: payload.metadata || {},
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapSecurityEventRecord(data);
  } catch (err) {
    console.error('Error logging security event:', err);
    throw err;
  }
};

export const getSecurityEvents = async (storeId, filters = {}) => {
  try {
    let query = supabase
      .from('security_events')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.success !== undefined) {
      query = query.eq('success', filters.success);
    }

    if (filters.unresolvedOnly) {
      query = query.is('resolved_at', null);
    }

    const { data, error } = await query.limit(filters.limit || 50);

    if (error) throw error;

    return data.map(mapSecurityEventRecord);
  } catch (err) {
    console.error('Error fetching security events:', err);
    throw err;
  }
};

export const resolveSecurityEvent = async (storeId, eventId) => {
  try {
    const { data, error } = await supabase
      .from('security_events')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapSecurityEventRecord(data);
  } catch (err) {
    console.error('Error resolving security event:', err);
    throw err;
  }
};

// ============================================================================
// DATA RETENTION AND COMPLIANCE
// ============================================================================

export const getDataRetentionPolicies = async (storeId) => {
  try {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('entity_type', { ascending: true });

    if (error) throw error;

    return data.map(mapRetentionPolicyRecord);
  } catch (err) {
    console.error('Error fetching retention policies:', err);
    throw err;
  }
};

export const createDataRetentionPolicy = async (storeId, payload) => {
  try {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .insert([
        {
          store_id: storeId,
          policy_name: payload.policyName,
          entity_type: payload.entityType,
          retention_days: payload.retentionDays,
          retention_reason: payload.retentionReason,
          auto_delete: payload.autoDelete || false,
          backup_before_delete: payload.backupBeforeDelete !== false,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapRetentionPolicyRecord(data);
  } catch (err) {
    console.error('Error creating retention policy:', err);
    throw err;
  }
};

export const getComplianceStatus = async (storeId, framework = null) => {
  try {
    let query = supabase
      .from('compliance_status')
      .select('*')
      .eq('store_id', storeId)
      .order('compliance_framework', { ascending: true });

    if (framework) {
      query = query.eq('compliance_framework', framework);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(mapComplianceStatusRecord);
  } catch (err) {
    console.error('Error fetching compliance status:', err);
    throw err;
  }
};

export const updateComplianceStatus = async (storeId, requirementId, payload) => {
  try {
    const { data, error } = await supabase
      .from('compliance_status')
      .update({
        status: payload.status,
        evidence_url: payload.evidenceUrl || null,
        notes: payload.notes || null,
        remediation_plan: payload.remediationPlan || null,
        remediation_due_date: payload.remediationDueDate || null,
        verified_at: payload.status === 'verified' ? new Date().toISOString() : null,
      })
      .eq('store_id', storeId)
      .eq('requirement_id', requirementId)
      .select()
      .single();

    if (error) throw error;

    return mapComplianceStatusRecord(data);
  } catch (err) {
    console.error('Error updating compliance status:', err);
    throw err;
  }
};

// ============================================================================
// AUDIT STATISTICS
// ============================================================================

export const getAuditStatistics = async (storeId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('audit_logs')
      .select('event_category, severity')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const stats = {
      totalEvents: data.length,
      bySeverity: {},
      byCategory: {},
      criticalCount: 0,
      warningCount: 0,
    };

    data.forEach((log) => {
      // Count by severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      if (log.severity === 'critical') stats.criticalCount++;
      if (log.severity === 'warning') stats.warningCount++;

      // Count by category
      stats.byCategory[log.event_category] = (stats.byCategory[log.event_category] || 0) + 1;
    });

    return stats;
  } catch (err) {
    console.error('Error calculating audit statistics:', err);
    throw err;
  }
};

// ============================================================================
// DATA MAPPERS
// ============================================================================

const mapAuditLogRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  userId: record.user_id,
  eventType: record.event_type,
  eventCategory: record.event_category,
  entityType: record.entity_type,
  entityId: record.entity_id,
  action: record.action,
  severity: record.severity,
  sourceIp: record.source_ip,
  userAgent: record.user_agent,
  requestId: record.request_id,
  changes: record.changes,
  oldValues: record.old_values,
  newValues: record.new_values,
  status: record.status,
  errorMessage: record.error_message,
  metadata: record.metadata || {},
  isCompliant: record.is_compliant,
  createdAt: record.created_at,
});

const mapRolePermissionRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  roleName: record.role_name,
  permissionCode: record.permission_code,
  resourceType: record.resource_type,
  actionType: record.action_type,
  conditions: record.conditions,
  isEnabled: record.is_enabled,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapUserRoleRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  userId: record.user_id,
  roleName: record.role_name,
  assignedBy: record.assigned_by,
  assignedAt: record.assigned_at,
  revokedBy: record.revoked_by,
  revokedAt: record.revoked_at,
  isActive: record.is_active,
  metadata: record.metadata,
});

const mapSecurityEventRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  userId: record.user_id,
  eventType: record.event_type,
  severity: record.severity,
  description: record.description,
  sourceIp: record.source_ip,
  success: record.success,
  mfaUsed: record.mfa_used,
  deviceFingerprint: record.device_fingerprint,
  metadata: record.metadata || {},
  resolvedAt: record.resolved_at,
  createdAt: record.created_at,
});

const mapRetentionPolicyRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  policyName: record.policy_name,
  entityType: record.entity_type,
  retentionDays: record.retention_days,
  retentionReason: record.retention_reason,
  autoDelete: record.auto_delete,
  backupBeforeDelete: record.backup_before_delete,
  isActive: record.is_active,
  lastExecutedAt: record.last_executed_at,
  nextExecutionAt: record.next_execution_at,
  deletedRecordsCount: record.deleted_records_count,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapComplianceStatusRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  complianceFramework: record.compliance_framework,
  requirementId: record.requirement_id,
  requirementName: record.requirement_name,
  status: record.status,
  evidenceUrl: record.evidence_url,
  verifiedAt: record.verified_at,
  verifiedBy: record.verified_by,
  notes: record.notes,
  remediationPlan: record.remediation_plan,
  remediationDueDate: record.remediation_due_date,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapAuditEventTypeRecord = (record) => ({
  id: record.id,
  eventType: record.event_type,
  eventCategory: record.event_category,
  description: record.description,
  severity: record.severity,
  isActive: record.is_active,
  createdAt: record.created_at,
});
