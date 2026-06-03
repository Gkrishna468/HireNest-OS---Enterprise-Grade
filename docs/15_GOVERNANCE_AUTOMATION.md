# Governance Automation

This document defines the automated governance and auditing capabilities within HireNestOS, designed to shift governance from manual review to programmatic enforcement.

## Architecture & Schema Auditing

The `architectureAuditor` ensures that the Firestore database schema adheres strictly to the defined canonical collections.

**Rules:**
- **Unauthorized Collections:** Any collection outside the canonical list (e.g., `candidatePool`, `submissions`, `ownershipVault`, `eventLedger`, `organizations`, `users`, `requirements`) triggers a critical release block.
- **Index Management:** Tracks unintended index sprawl.
- **Schema Evolution:** Validates mutations against `09_CHANGE_MANAGEMENT.md`.

## Data Governance Auditing

The `dataGovernanceAuditor` monitors the platform for split-brain data conflicts and single-source-of-truth violations.

**Rules:**
- **Redundant State Fields:** Detects when domain states (like `candidate.status`) are being stored when they should be derived from system events (like `submissions` or `eventLedger`).
- **PII Leakage:** Validates that secure fields do not leak into unstructured log data or derived fields.
- **Mock Data Prohibition:** Detects hardcoded values (e.g. `const data = [...]`), random generators for metrics, or fake data in analytics, executive dashboards, or operational intelligence screens. Failing to back these screens with actual Firebase documents will trigger a `Release Blocked` failure.

## AI Governance Auditing

The `aiGovernanceAuditor` verifies the integrity of the matching engine weights and AI heuristics.

**Validation Baseline:**
- Skills Weight: 40%
- Experience Weight: 25%
- Location Weight: 15%
- Domain Weight: 10%
- Certifications Weight: 10%

Deviation from these weights without an explicit governance override will block the release.

## Product Governance Auditing

The `productGovernanceAuditor` verifies that structural additions to the platform (routes, workspaces, modules) correspond to approved tickets in `08_FEATURE_BACKLOG.md`.

## Release Gate Engine

The `releaseGateEngine` orchestrates all auditors.

**Workflow:**
1. Developer initiates release.
2. Engine triggers concurrent audits (Architecture, Data, AI, Product, Security).
3. If any audit fails, the deployment is hard-blocked and an anomaly report is generated.
4. If all pass, status changes to **Release Approved**.
