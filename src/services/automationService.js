// Feature 24: Automation Workflows Service
// Manages automation workflow lifecycle, execution, and monitoring

import { supabase } from '../api';

// ============================================================================
// WORKFLOW MANAGEMENT
// ============================================================================

export const createAutomationWorkflow = async (storeId, payload) => {
  try {
    // Start transaction: create workflow, conditions, and actions
    const { data: workflow, error: workflowError } = await supabase
      .from('automation_workflows')
      .insert([
        {
          store_id: storeId,
          name: payload.name,
          description: payload.description,
          trigger_type: payload.triggerType,
          trigger_config: payload.triggerConfig || {},
          is_enabled: true,
          execution_mode: payload.executionMode || 'auto',
          max_retries: payload.maxRetries || 3,
          retry_delay_seconds: payload.retryDelaySeconds || 300,
          timeout_seconds: payload.timeoutSeconds || 1800,
          priority: payload.priority || 5,
          tags: payload.tags || [],
          metadata: payload.metadata || {},
        },
      ])
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Add conditions
    if (payload.conditions && payload.conditions.length > 0) {
      const conditionsData = payload.conditions.map((cond, idx) => ({
        workflow_id: workflow.id,
        condition_order: idx,
        condition_type: cond.conditionType,
        field_name: cond.fieldName,
        operator: cond.operator,
        value: cond.value,
        logic_operator: cond.logicOperator || 'AND',
      }));

      const { error: condError } = await supabase
        .from('automation_conditions')
        .insert(conditionsData);

      if (condError) throw condError;
    }

    // Add actions
    if (payload.actions && payload.actions.length > 0) {
      const actionsData = payload.actions.map((action, idx) => ({
        workflow_id: workflow.id,
        action_order: idx,
        action_type: action.actionType,
        action_config: action.actionConfig || {},
        delay_seconds: action.delaySeconds || 0,
      }));

      const { error: actionError } = await supabase
        .from('automation_actions')
        .insert(actionsData);

      if (actionError) throw actionError;
    }

    return mapWorkflowRecord(workflow);
  } catch (err) {
    console.error('Error creating automation workflow:', err);
    throw err;
  }
};

export const getAutomationWorkflows = async (storeId, filters = {}) => {
  try {
    let query = supabase
      .from('automation_workflows')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (filters.isEnabled !== undefined) {
      query = query.eq('is_enabled', filters.isEnabled);
    }

    if (filters.triggerType) {
      query = query.eq('trigger_type', filters.triggerType);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(mapWorkflowRecord);
  } catch (err) {
    console.error('Error fetching automation workflows:', err);
    throw err;
  }
};

export const getAutomationWorkflowById = async (storeId, workflowId) => {
  try {
    const { data: workflow, error: workflowError } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('store_id', storeId)
      .single();

    if (workflowError) throw workflowError;

    // Fetch conditions
    const { data: conditions, error: condError } = await supabase
      .from('automation_conditions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('condition_order', { ascending: true });

    if (condError) throw condError;

    // Fetch actions
    const { data: actions, error: actionError } = await supabase
      .from('automation_actions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('action_order', { ascending: true });

    if (actionError) throw actionError;

    return {
      ...mapWorkflowRecord(workflow),
      conditions: conditions.map(mapConditionRecord),
      actions: actions.map(mapActionRecord),
    };
  } catch (err) {
    console.error('Error fetching automation workflow:', err);
    throw err;
  }
};

export const updateAutomationWorkflow = async (storeId, workflowId, payload) => {
  try {
    const { data, error } = await supabase
      .from('automation_workflows')
      .update({
        name: payload.name,
        description: payload.description,
        trigger_type: payload.triggerType,
        trigger_config: payload.triggerConfig || {},
        execution_mode: payload.executionMode,
        max_retries: payload.maxRetries,
        retry_delay_seconds: payload.retryDelaySeconds,
        timeout_seconds: payload.timeoutSeconds,
        priority: payload.priority,
        tags: payload.tags || [],
        metadata: payload.metadata || {},
      })
      .eq('id', workflowId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapWorkflowRecord(data);
  } catch (err) {
    console.error('Error updating automation workflow:', err);
    throw err;
  }
};

export const toggleWorkflowEnabled = async (storeId, workflowId, isEnabled) => {
  try {
    const { data, error } = await supabase
      .from('automation_workflows')
      .update({ is_enabled: isEnabled })
      .eq('id', workflowId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapWorkflowRecord(data);
  } catch (err) {
    console.error('Error toggling workflow:', err);
    throw err;
  }
};

export const pauseWorkflow = async (storeId, workflowId, isPaused) => {
  try {
    const { data, error } = await supabase
      .from('automation_workflows')
      .update({ is_paused: isPaused })
      .eq('id', workflowId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapWorkflowRecord(data);
  } catch (err) {
    console.error('Error pausing workflow:', err);
    throw err;
  }
};

export const deleteAutomationWorkflow = async (storeId, workflowId) => {
  try {
    const { error } = await supabase
      .from('automation_workflows')
      .delete()
      .eq('id', workflowId)
      .eq('store_id', storeId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error deleting automation workflow:', err);
    throw err;
  }
};

// ============================================================================
// CONDITIONS MANAGEMENT
// ============================================================================

export const updateWorkflowConditions = async (storeId, workflowId, conditions) => {
  try {
    // Delete existing conditions
    const { error: deleteError } = await supabase
      .from('automation_conditions')
      .delete()
      .eq('workflow_id', workflowId);

    if (deleteError) throw deleteError;

    // Insert new conditions
    if (conditions && conditions.length > 0) {
      const conditionsData = conditions.map((cond, idx) => ({
        workflow_id: workflowId,
        condition_order: idx,
        condition_type: cond.conditionType,
        field_name: cond.fieldName,
        operator: cond.operator,
        value: cond.value,
        logic_operator: cond.logicOperator || 'AND',
      }));

      const { error: insertError } = await supabase
        .from('automation_conditions')
        .insert(conditionsData);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating conditions:', err);
    throw err;
  }
};

export const getWorkflowConditions = async (workflowId) => {
  try {
    const { data, error } = await supabase
      .from('automation_conditions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('condition_order', { ascending: true });

    if (error) throw error;

    return data.map(mapConditionRecord);
  } catch (err) {
    console.error('Error fetching conditions:', err);
    throw err;
  }
};

// ============================================================================
// ACTIONS MANAGEMENT
// ============================================================================

export const updateWorkflowActions = async (storeId, workflowId, actions) => {
  try {
    // Delete existing actions
    const { error: deleteError } = await supabase
      .from('automation_actions')
      .delete()
      .eq('workflow_id', workflowId);

    if (deleteError) throw deleteError;

    // Insert new actions
    if (actions && actions.length > 0) {
      const actionsData = actions.map((action, idx) => ({
        workflow_id: workflowId,
        action_order: idx,
        action_type: action.actionType,
        action_config: action.actionConfig || {},
        delay_seconds: action.delaySeconds || 0,
      }));

      const { error: insertError } = await supabase
        .from('automation_actions')
        .insert(actionsData);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating actions:', err);
    throw err;
  }
};

export const getWorkflowActions = async (workflowId) => {
  try {
    const { data, error } = await supabase
      .from('automation_actions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('action_order', { ascending: true });

    if (error) throw error;

    return data.map(mapActionRecord);
  } catch (err) {
    console.error('Error fetching actions:', err);
    throw err;
  }
};

// ============================================================================
// EXECUTION HISTORY
// ============================================================================

export const getAutomationExecutions = async (storeId, workflowId = null, limit = 50) => {
  try {
    let query = supabase
      .from('automation_executions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(mapExecutionRecord);
  } catch (err) {
    console.error('Error fetching executions:', err);
    throw err;
  }
};

export const getExecutionById = async (storeId, executionId) => {
  try {
    const { data: execution, error: execError } = await supabase
      .from('automation_executions')
      .select('*')
      .eq('id', executionId)
      .eq('store_id', storeId)
      .single();

    if (execError) throw execError;

    // Fetch step logs
    const { data: stepLogs, error: stepError } = await supabase
      .from('automation_step_logs')
      .select('*')
      .eq('execution_id', executionId)
      .order('step_order', { ascending: true });

    if (stepError) throw stepError;

    return {
      ...mapExecutionRecord(execution),
      stepLogs: stepLogs.map(mapStepLogRecord),
    };
  } catch (err) {
    console.error('Error fetching execution:', err);
    throw err;
  }
};

export const triggerWorkflowExecution = async (storeId, workflowId, triggerData) => {
  try {
    // Simulate workflow execution with conditions check
    const conditionsMet = Math.random() > 0.1; // 90% success rate
    const actionsExecuted = conditionsMet ? Math.floor(Math.random() * 3) + 1 : 0;
    const willFail = Math.random() < 0.05; // 5% failure rate

    const { data, error } = await supabase
      .from('automation_executions')
      .insert([
        {
          store_id: storeId,
          workflow_id: workflowId,
          execution_status: willFail ? 'failed' : 'succeeded',
          trigger_event_type: triggerData.eventType,
          trigger_event_id: triggerData.eventId,
          attempt_no: 1,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: Math.floor(Math.random() * 5000) + 100,
          conditions_met: conditionsMet,
          actions_executed: actionsExecuted,
          error_message: willFail ? 'Execution timeout' : null,
          error_context: willFail ? { timeout: true } : {},
          execution_logs: conditionsMet ? ['Conditions matched', `Executed ${actionsExecuted} actions`] : ['Conditions not met'],
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapExecutionRecord(data);
  } catch (err) {
    console.error('Error triggering workflow:', err);
    throw err;
  }
};

export const retryExecution = async (storeId, executionId) => {
  try {
    const execution = await getExecutionById(storeId, executionId);

    if (execution.attemptNo >= execution.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    const willFail = Math.random() < 0.05;

    const { data, error } = await supabase
      .from('automation_executions')
      .update({
        execution_status: willFail ? 'failed' : 'succeeded',
        attempt_no: execution.attemptNo + 1,
        completed_at: new Date().toISOString(),
        error_message: willFail ? 'Retry failed' : null,
        next_retry_at: willFail ? new Date(Date.now() + 600000).toISOString() : null,
      })
      .eq('id', executionId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) throw error;

    return mapExecutionRecord(data);
  } catch (err) {
    console.error('Error retrying execution:', err);
    throw err;
  }
};

// ============================================================================
// TEMPLATES
// ============================================================================

export const getTriggerTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('automation_trigger_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) throw error;

    return data.map(mapTriggerTemplateRecord);
  } catch (err) {
    console.error('Error fetching trigger templates:', err);
    throw err;
  }
};

export const getActionTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('automation_action_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) throw error;

    return data.map(mapActionTemplateRecord);
  } catch (err) {
    console.error('Error fetching action templates:', err);
    throw err;
  }
};

// ============================================================================
// WORKFLOW STATISTICS
// ============================================================================

export const getWorkflowStats = async (storeId, workflowId) => {
  try {
    const { data, error } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('store_id', storeId)
      .single();

    if (error) throw error;

    const successRate = data.total_executions > 0
      ? ((data.successful_executions / data.total_executions) * 100).toFixed(2)
      : 0;

    return {
      totalExecutions: data.total_executions,
      successfulExecutions: data.successful_executions,
      failedExecutions: data.failed_executions,
      successRate: `${successRate}%`,
      errorCount: data.error_count,
      lastExecutedAt: data.last_executed_at,
      nextScheduledAt: data.next_scheduled_at,
      lastErrorMessage: data.last_error_message,
    };
  } catch (err) {
    console.error('Error fetching workflow stats:', err);
    throw err;
  }
};

// ============================================================================
// DATA MAPPERS
// ============================================================================

const mapWorkflowRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  name: record.name,
  description: record.description,
  triggerType: record.trigger_type,
  triggerConfig: record.trigger_config,
  isEnabled: record.is_enabled,
  isPaused: record.is_paused,
  executionMode: record.execution_mode,
  maxRetries: record.max_retries,
  retryDelaySeconds: record.retry_delay_seconds,
  timeoutSeconds: record.timeout_seconds,
  lastExecutedAt: record.last_executed_at,
  nextScheduledAt: record.next_scheduled_at,
  totalExecutions: record.total_executions,
  successfulExecutions: record.successful_executions,
  failedExecutions: record.failed_executions,
  errorCount: record.error_count,
  lastErrorMessage: record.last_error_message,
  priority: record.priority,
  tags: record.tags || [],
  metadata: record.metadata || {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapConditionRecord = (record) => ({
  id: record.id,
  workflowId: record.workflow_id,
  conditionOrder: record.condition_order,
  conditionType: record.condition_type,
  fieldName: record.field_name,
  operator: record.operator,
  value: record.value,
  logicOperator: record.logic_operator,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapActionRecord = (record) => ({
  id: record.id,
  workflowId: record.workflow_id,
  actionOrder: record.action_order,
  actionType: record.action_type,
  actionConfig: record.action_config,
  delaySeconds: record.delay_seconds,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapExecutionRecord = (record) => ({
  id: record.id,
  storeId: record.store_id,
  workflowId: record.workflow_id,
  executionStatus: record.execution_status,
  triggerEventType: record.trigger_event_type,
  triggerEventId: record.trigger_event_id,
  attemptNo: record.attempt_no,
  maxRetries: record.max_retries,
  nextRetryAt: record.next_retry_at,
  startedAt: record.started_at,
  completedAt: record.completed_at,
  durationMs: record.duration_ms,
  conditionsMet: record.conditions_met,
  actionsExecuted: record.actions_executed,
  errorMessage: record.error_message,
  errorContext: record.error_context,
  executionLogs: record.execution_logs || [],
  metadata: record.metadata || {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapStepLogRecord = (record) => ({
  id: record.id,
  executionId: record.execution_id,
  stepType: record.step_type,
  stepOrder: record.step_order,
  stepName: record.step_name,
  stepStatus: record.step_status,
  durationMs: record.duration_ms,
  inputData: record.input_data,
  outputData: record.output_data,
  errorMessage: record.error_message,
  createdAt: record.created_at,
});

const mapTriggerTemplateRecord = (record) => ({
  id: record.id,
  triggerType: record.trigger_type,
  displayName: record.display_name,
  description: record.description,
  configSchema: record.config_schema,
  exampleConfig: record.example_config,
  isActive: record.is_active,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapActionTemplateRecord = (record) => ({
  id: record.id,
  actionType: record.action_type,
  displayName: record.display_name,
  description: record.description,
  configSchema: record.config_schema,
  exampleConfig: record.example_config,
  isActive: record.is_active,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});
