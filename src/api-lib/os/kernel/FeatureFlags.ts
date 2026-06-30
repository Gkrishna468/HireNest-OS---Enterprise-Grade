export const FeatureFlags = {
  AI_RUNTIME_ENABLED: process.env.AI_RUNTIME_ENABLED !== "false", // Default true
  ASYNC_EVENT_PROCESSING_ENABLED:
    process.env.ASYNC_EVENT_PROCESSING_ENABLED !== "false",
  MATCHING_OFFICE_ENABLED: process.env.MATCHING_OFFICE_ENABLED !== "false",
  WORKFLOW_ENGINE_ENABLED: process.env.WORKFLOW_ENGINE_ENABLED !== "false",
  SAGA_ENGINE_ENABLED: process.env.SAGA_ENGINE_ENABLED !== "false",
  OUTBOX_PATTERN_ENABLED: process.env.OUTBOX_PATTERN_ENABLED !== "false",
};
