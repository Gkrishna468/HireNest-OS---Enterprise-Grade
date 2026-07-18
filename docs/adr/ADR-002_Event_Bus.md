# ADR-002: Event Bus Architecture

- **Date**: 2026-07-18
- **Status**: Accepted
- **Context**: As the platform scales, tightly coupling services (e.g., a Job Creation API directly calling a Notification API and an AI Matching API) leads to brittle, slow HTTP endpoints and cascading failures.
- **Decision**: Implement a decoupled Event Bus using the `system_events` Firestore collection. Services publish immutable events (e.g., `REQUIREMENT_CREATED`), and background workers/subscribers react asynchronously.
- **Alternatives considered**:
  - Google Cloud Pub/Sub (Rejected: Overkill for the current scale, keeps architecture simpler by using Firestore as the message broker).
  - Synchronous REST calls (Rejected: High latency, low fault tolerance).
- **Consequences**:
  - API handlers return in <200ms.
  - Requires strict governance over event schemas (`EVENT_CATALOG.md`).
  - Event schemas must be backward compatible.
