# Disaster Recovery Architecture

This document defines the recovery mechanisms, dead-letter strategy, and multi-tenant isolation protocols required for operating HireNestOS at scale.

## Dead-Letter Queue (DLQ) Strategy

When the workflow orchestrator or event bus encounters an event that cannot be processed (due to malformed payloads, unavailable downstream systems, or validation failures), it is routed to the DLQ.

1. **Routing**: Any handler hitting a non-retryable error (or exhausting retries) writes the event, payload, and stack trace to `dlq_events`.
2. **Monitoring**: System administrators receive alerts when the DLQ depth exceeds zero.
3. **Replay**: Administrators can manually inspect, mutate (if necessary), and route the event back into the primary bus.

## Projection Rebuild Strategy

In the event of database corruption or systemic UI drift, projections must be rebuilt from the Submission Ledger.
- Use `WorkflowRegistry` to mass-dispatch recalculation commands offline or during maintenance windows.
- Projections are distinct from sources of truth. `submissions` are safe; `interviews` (as a read model) can be truncated and rehydrated 100% from submissions.

## Restoring Multi-Tenant State

HireNestOS serves HQ, Vendors, and Clients. Disaster recovery must never cross-pollinate tenant data.
- **Tenant Scope Isolation**: All rebuilt records must strictly copy the `clientId` and `vendorId`.
- **RBAC Checks on Recovery**: Replayed events must bypass standard UI RBAC but must be validated against a system-level administrative identity to guarantee malicious replays are prevented.

## State Machine Recovery

If a worker crashes mid-transition:
1. The Durable Runtime (Temporal concepts) automatically re-assigns the task snippet to a new worker.
2. The `validateTransition` logic in `InterviewWorkflow` provides a firm guarantee against double-stepping states on recovery.
3. If an intermediate state is fundamentally corrupted, administrators utilize a specific compensation event (`SYSTEM_STATE_ROLLBACK`) to move the entity to a safe known checkpoint.
