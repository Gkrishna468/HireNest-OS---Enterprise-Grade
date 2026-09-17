import { z } from 'zod';
import { OpenUIActionName } from '../../types';

// Render Contract Validator
export const OpenUIWorkspaceContextSchema = z.object({
  requirementId: z.string().optional(),
  clientId: z.string().optional(),
  currentUser: z.string().optional(),
  selectedCandidates: z.array(z.string()).optional(),
  activeVendor: z.string().optional(),
  currentFilters: z.record(z.string(), z.any()).optional(),
  currentTab: z.string().optional(),
}).strict();

export const OpenUIRenderContractSchema = z.object({
  responseType: z.enum(['text', 'generative_ui', 'multi_component', 'action_confirmation']),
  component: z.string().optional(),
  version: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  actions: z.array(z.string()).optional(),
  context: OpenUIWorkspaceContextSchema.optional(),
  telemetry: z.object({
    model: z.string().optional(),
    tokens: z.number().optional(),
    latencyMs: z.number().optional(),
    toolsCalled: z.array(z.string()).optional(),
    firestoreReads: z.number().optional(),
    firestoreWrites: z.number().optional(),
    cacheHit: z.boolean().optional(),
    confidence: z.number().optional(),
    policyChecks: z.array(z.string()).optional(),
  }).optional(),
});

// Individual Action Schema Registry
export const ACTION_SCHEMAS: Record<OpenUIActionName, z.ZodObject<Record<string, z.ZodTypeAny>, any, any>> = {
  APPROVE_SLA: z.object({
    action: z.literal('APPROVE_SLA'),
    entityType: z.literal('requirement'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    requestedValue: z.number().min(1).max(365),
    source: z.literal('openui'),
  }),
  OVERRIDE_MATCH_SCORE: z.object({
    action: z.literal('OVERRIDE_MATCH_SCORE'),
    entityType: z.literal('candidate'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    requirementId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    requestedValue: z.number().min(0).max(100),
    reason: z.string().min(5).max(1000),
    source: z.literal('openui'),
  }),
  SHORTLIST_CANDIDATE: z.object({
    action: z.literal('SHORTLIST_CANDIDATE'),
    entityType: z.literal('candidate'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    requirementId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    source: z.literal('openui'),
  }),
  SUBMIT_CANDIDATE: z.object({
    action: z.literal('SUBMIT_CANDIDATE'),
    entityType: z.literal('candidate'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    requirementId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    source: z.literal('openui'),
  }),
  REQUEST_CANDIDATE_UPDATE: z.object({
    action: z.literal('REQUEST_CANDIDATE_UPDATE'),
    entityType: z.literal('candidate'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    source: z.literal('openui'),
  }),
  CREATE_FOLLOWUP: z.object({
    action: z.literal('CREATE_FOLLOWUP'),
    entityType: z.enum(['candidate', 'requirement', 'vendor', 'task']),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    requestedValue: z.string().min(1).max(2000),
    source: z.literal('openui'),
  }),
  ASSIGN_TASK: z.object({
    action: z.literal('ASSIGN_TASK'),
    entityType: z.literal('task'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    requestedValue: z.string().min(1).max(128),
    source: z.literal('openui'),
  }),
  LAUNCH_CAMPAIGN: z.object({
    action: z.literal('LAUNCH_CAMPAIGN'),
    entityType: z.literal('requirement'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    source: z.literal('openui'),
  }),
  VIEW_REQUIREMENT: z.object({
    action: z.literal('VIEW_REQUIREMENT'),
    entityType: z.literal('requirement'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    source: z.literal('openui'),
  }),
  VIEW_VENDOR: z.object({
    action: z.literal('VIEW_VENDOR'),
    entityType: z.literal('vendor'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    source: z.literal('openui'),
  }),
  VIEW_CANDIDATE: z.object({
    action: z.literal('VIEW_CANDIDATE'),
    entityType: z.literal('candidate'),
    entityId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\\-]+$/),
    source: z.literal('openui'),
  }),
};

/**
 * Validates any dynamic inbound action payload.
 * Throws a ZodError if validation fails.
 */
export function validateOpenUIAction(payload: unknown) {
  const castedPayload = payload as Record<string, unknown> | null;
  const actionName = castedPayload?.action as OpenUIActionName;
  if (!actionName || !ACTION_SCHEMAS[actionName]) {
    throw new Error(`[OpenUI Validator] Unknown or unsupported action: ${actionName}`);
  }
  return ACTION_SCHEMAS[actionName].parse(payload);
}
