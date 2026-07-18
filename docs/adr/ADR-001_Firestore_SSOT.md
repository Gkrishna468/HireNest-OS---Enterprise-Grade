# ADR-001: Firestore as Single Source of Truth (SSOT)

- **Date**: 2026-07-18
- **Status**: Accepted
- **Context**: The platform requires a globally consistent, real-time database to manage highly concurrent state changes across the Candidate, Requirement, and Vendor domains. Relying on local or fragmented state causes data drift.
- **Decision**: Firestore is mandated as the Single Source of Truth (SSOT). All state mutations must be pushed to Firestore first, and clients must react to Firestore snapshot updates.
- **Alternatives considered**: 
  - PostgreSQL (Rejected: Lacks out-of-the-box real-time subscriptions and seamless Firebase Auth integration).
  - MongoDB (Rejected: Higher operational overhead for real-time listeners).
- **Consequences**:
  - Requires strict adherence to `firestore.rules` for ABAC security.
  - Requires explicit index management (`firestore.indexes.json`).
  - Strict prohibition on N+1 queries and unbounded `.get()` calls to control costs.
