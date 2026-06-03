# Firestore Governance Audit

## Overview
This audit evaluates the compliance of all core Firestore collections against the rules defined in `02_BUSINESS_RULES.md`, `03_ARCHITECTURE.md`, `04_SECURITY.md`, and `05_DATA_GOVERNANCE.md`.

## Compliance Scorecard

| Area | Score | Notes |
|---|---|---|
| PRD Alignment | 100 | Multi-tenant workspaces and features align with initial PRD. |
| Architecture Compliance | 85 | Schema generally matches expectations, but some collections like `candidatePool` historically carried `pipelineStage`, leading to drift. |
| Security Compliance | 90 | Strong Attribute-Based Access Control (ABAC) in place, though global fallback blocks `GLOBAL_ADMIN` vs `isHQ()` might need constant vigilance. |
| Data Governance Compliance | 75 | Candidate drift migrations built, but schema models need stricter checks to ensure `pipelineStage` is never actively updated in `candidatePool` over `submissions.status`. |
| AI Governance Compliance | 100 | AI Agents strictly structured for match generation. |

## Collection Audits

### 1. `candidatePool`
- **Source of Truth**: Candidate Metadata & Resume Data.
- **Ownership**: Read restricted to associated `vendorId`, `clientId`, or `isAdmin()`.
- **Write Permissions**: Restricts manual name updates.
- **Duplicate Prevention**: Hash comparisons occur BEFORE creation.
- **Audit Findings**:
  - Requires continuous enforcement to NOT treat `candidatePool.pipelineStage` as the active progression source to prevent vendor/client drift.
  - Legacy fields like `vendorId` vs `sysSource` need to be unified.

### 2. `submissions`
- **Source of Truth**: The definitive pipeline stage tracking per requirement.
- **Ownership**: Scoped to the `vendorId` that submitted to the `clientId`.
- **Write Permissions**: Modifiable by Client and Recruiter.
- **Duplicate Prevention**: Re-submissions handled at creation time by UUID constraints.
- **Audit Findings**:
  - The true source of candidate hierarchy.

### 3. `event_ledger`
- **Source of Truth**: Immutable audit log of all transitions.
- **Ownership**: Global log; access restricted by role or explicit `recipients`.
- **Write Permissions**: Create-only. Update and Delete heavily forbidden `if false`.
- **Audit Findings**:
  - Meets 100% compliance with data immutability.

### 4. `users` & `organizations`
- **Source of Truth**: Authentication linkage to system roles (Admin, Vendor, Client).
- **Ownership**: Self or Admin.
- **Audit Findings**: ABAC implemented correctly via rules like `isValidUser()`.

### 5. `requirements_public` & `requirements_private`
- **Source of Truth**: Job Req records.
- **Ownership**: Governed by `clientId`.
- **Audit Findings**: Public reqs appropriately isolated from private visibility. Vendor network receives accurate broadcasts.

### 6. `ownership_claims` & `ownershipVault`
- **Source of Truth**: Establishes 180-day vendor holds.
- **Ownership**: Enforced by expiration timestamps (`expiresAt`) and `vendorId`.
- **Write Permissions**: Verifiable only by system or owning Vendor.
- **Audit Findings**: Replaces legacy `candidateOwnership`. Fully structured with dispute logs.

## Remediation Tasks (Next Steps)
- Eliminate all direct UI reads of `candidate.pipelineStage` across table components, pointing explicitly to `submission.status`.
- Validate that duplicate detection explicitly queries `candidate_identity` arrays to cover phone, email, AND resume hash concurrently.
