# Phase 4.5: Observability Architecture Governance

## Core Philosophy
In a distributed, event-driven system—and eventually Temporal-orchestrated—observability is paramount. It is the only way to trace complex asynchronous business flows across boundaries.

**CRITICAL RULES:**
1. **Trace Preservation.** Every log, event, and activity MUST string along its source context.
2. **Standard Keys.** Log payloads must use standardized identifiers.

## Required Identifiers
Every dispatched workflow, event envelope, and activity context must propagate the following:

- `traceId`: The root identifier for a single user journey or system cron execution.
- `correlationId`: Ties a saga of bounded business events together (e.g., `req_123` or `sub_456`).
- `workflowId`: Unique to the specific execution of a state machine or workflow runner.
- `tenantId`: Organizational partition (e.g., `client_789` or `vendor_012`).
- `actorId`: The user or AI agent initiating the trace.
- `requestId`: The specific HTTP or RPC request layer ID.

## Example Context Flow:
```text
UI Request
    ↓
Workflow Layer (Injects Trace ID, Correlation ID)
    ↓
Event Bus (Carries Correlation ID + Trace ID)
    ↓
Temporal Worker (Resumes Correlation ID, Generates new Workflow ID)
    ↓
Activity
    ↓
Service (Logs Context)
```

By strictly adhering to these contextual attributes, debugging distributed sagas becomes a linear, searchable query in any log aggregation platform.
