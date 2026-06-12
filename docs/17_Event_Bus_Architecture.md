# Phase 4: Event Bus Architecture Governance

## Core Philosophy
The Event Bus provides the circulatory system for HireNestOS. It enforces decoupling between Workflows, Analytics, and operational side-effects.

**CRITICAL RULES:**
1. **Events are Immutable.** Once published, an event describes a historical fact. It cannot be altered or retracted.
2. **Events Carry Facts, Not Commands.** Name events in the past tense (e.g., `SUBMISSION_CREATED`), not imperative verbs.
3. **One-Way Routing.** Workflows publish Events. Handlers subscribe to Events and may invoke downstream Workflows. Services never invoke the Event Bus directly.

## Event Specifications

### 1. Structure
All events adhere to the `EventEnvelope<T>` format containing:
- `id`: Unique event identifier (UUID).
- `type`: The `EventType` fact.
- `timestamp`: UTC ISO string of occurrence.
- `tenantId`: Client/Vendor boundary protection.
- `correlationId`: Ties a saga of events together for distributed tracing and Temporal orchestration.
- `payload`: Generic payload `T` containing the actual fact data.

### 2. Consumers & Producers
- **Producers**: Primarily Workflows (e.g., `SubmissionWorkflow` upon finishing validation).
- **Consumers**: Handlers (e.g., `VendorEventHandler` listening for `JOB_PUBLISHED`).
- **Dead-Letter Handling**: Any event failure exceeding max retries is pushed to a Dead Letter Queue (DLQ) for admin review.

### 3. Reliability Guarantees
- **Retry Policy**: Default 3 exponential backoff attempts for transient failures.
- **Idempotency Strategy**: Handlers use the `EventEnvelope.id` combined with `correlationId` to ensure repeated delivery does not duplicate state changes.
- **Ordering**: In the Local/Firebase bridge, ordering is soft-guaranteed by `timestamp`. Strict chronological ordering requires sequence IDs (addressed in Phase 5).
- **Multi-tenant Isolation**: Events strictly carry `tenantId`. Broadcast mechanisms filter by `tenantId`.

## Event Sagas Examples
- `SubmissionWorkflow` produces `SUBMISSION_MATCHED`.
- `EventBus` routes to `VendorEventHandler`.
- `VendorEventHandler` triggers `VendorWorkflow`.
