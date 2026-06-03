# Feature Ticket System

## Format
Each ticket must contain: Name, Description, Acceptance Criteria, Priority, Dependencies.

---

### HN-001: Candidate Ownership Vault
**Description**: Define explicit data models for vendor ownership of candidates.
**Acceptance Criteria**:
- Candidate owner is explicitly displayed on profile.
- Ownership is immutable for 180 days.
- Event ledger is updated upon ownership assignment.
- Submitting a duplicate candidate owned by another vendor returns a block alert.
**Priority**: Critical
**Dependencies**: `candidatePool`, `eventLedger`

### HN-002: Data Integrity Sprint
**Description**: Eliminate split-brain candidate status and enforce the Ownership Vault via a central Submission Orchestrator.
**Acceptance Criteria**:
- Remove all direct writes to `candidatePool.pipelineStage`.
- Route all status updates through `submissions.status`.
- Centralize submission logic into a Submission Orchestrator.
- Enforce Ownership Vault during submission creation.
- Add Event Ledger verification for all submission events.
**Priority**: Critical
**Dependencies**: `submissions`, `candidatePool`, `ownershipVault`
