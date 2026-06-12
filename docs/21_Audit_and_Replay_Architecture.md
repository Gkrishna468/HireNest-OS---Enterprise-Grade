# Audit and Replay Architecture

This document defines the architectural patterns for event replays, auditability, and projection rebuilds in HireNestOS as of Phase 5A execution readiness.

## Core Principle

All read models, views, and derived state (projections) must be deterministically rebuildable from the immutable event log. The event bus serves as the ultimate source of truth for "what happened", while the Submission Ledger serves as the ultimate source of truth for "current state".

## Event Replay Safety

When replaying events to rebuild a projection or correct an invalid state, the system must guarantee safety:
- **Duplicate Event Prevention**: Event IDs or idempotent keys must be used to ensure an event processed twice does not mutate the projection twice.
- **Ordered Replay**: Events must be replayed in strict chronological order based on the `createdAt` timestamp of the core event log.

## Idempotent Handlers

Every workflow handler responding to an event must be idempotent:

```typescript
// Conceptual Example
async handle(event: DomainEvent) {
  const existingProjection = await db.projections.get(event.entityId);
  if (existingProjection.lastProcessedEventId === event.id) {
    return; // Already processed
  }
  
  // Perform state mutation
  // ...
  
  await db.projections.update(event.entityId, {
    ...,
    lastProcessedEventId: event.id,
    version: existingProjection.version + 1
  });
}
```

## Rebuild Projection Strategy

### Scenario: Projection Drift

If the `InterviewsTab` (Interview Control Tower) drifts from the absolute submission state, or if a bug in the canonical mapper is released, we execute the Rebuild Projection routine.

**Execution Flow**:
1. **Snapshot**: System queries the base `submissions` collection.
2. **Replay Flow**: 
   - `Replay Event` -> `Rebuild Projection` -> `Restore Control Tower`
3. **Atomic Swaps**: When rebuilding large projections, a new projection collection/state tree is built offline, then aliased/swapped to avoid downtime.

## P0 Audit Compliance

All business-critical transitions must be logged in a dedicated `audit_logs` collection. This includes:
- Stage advancement (e.g., `AVAILABILITY_PENDING` -> `SCHEDULING`).
- Candidate rejections.
- Requirement approvals.
- SLA breaches.

This provides full visibility for Multi-Tenant scenarios where Clients, Vendors, and HQ must audit who changed a candidate's status and when.
