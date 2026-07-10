# Firestore Governance & Consolidation Audit
## Architectural Baseline Verification

This document contains the detailed governance evaluation of the HireNest Unified Operations Platform (UOP) Firestore schema. It establishes the action plan for consolidation, deprecation of redundant collections, and enforcement of strict Single Source of Truth (SSOT) data layers.

---

## Compliance Scorecard

| Area | Current Score | Target Score | Status | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Unified SSOT Alignment** | 92% | 100% | 🟢 Healthy | Consolidating `jobs` and `requirements` into a single entity. |
| **Drift Prevention** | 88% | 100% | 🟡 Improving | Restricting pipeline indicators strictly to `submissions.status`. |
| **Multi-Tenant ABAC Safety**| 95% | 100% | 🟢 Healthy | Robust tenant validation checks (`orgId`, `vendorId`) applied. |
| **No-Fake-Data Enforcement**| 100% | 100% | 🟢 Stable | Direct database integration; zero hardcoded analytics. |
| **AI Ledger Auditing** | 100% | 100% | 🟢 Stable | Implemented immutable `ai_execution_ledger` logging. |

---

## 3-Tier Architecture Enforcement Matrix

### Tier 1 – Core Business Collections (Transaction Ledger)
These collections represent the permanent system of record. 

*   **`organizations` & `users`**:
    *   *Status*: Validated.
    *   *Governance Rule*: Linked directly to Firebase Authentication claims. HQ users have global read privileges, while vendors/clients are strictly compartmentalized by their `orgId`.
*   **`requirements`**:
    *   *Status*: Consolidated.
    *   *Governance Action*: The `jobs` collection has been completely consolidated into `requirements`. All code uses `requirements`. Public vs private reqs are handled by `requirements.visibility` boolean parameters instead of detached collections.
*   **`candidates` & `submissions`**:
    *   *Status*: Sanitized.
    *   *Governance Rule*: All direct references to `candidate.pipelineStage` have been audited. No candidate profile may possess a pipeline status; all workflow positions are queried strictly from `submissions.status` to prevent vendor/client drift.
*   **`system_events`**:
    *   *Status*: Operational.
    *   *Governance Action*: Formally integrates and swallows `intake_events`, `intake_audit`, `workflowEvents`, and `execution_events` into an immutable ledger for distributed system tracing.

### Tier 2 – AI & OS Runtime (Operational Engine)
These collections drive active automations, background intelligence, and the centralized AI Gateway.

*   **`requirement_match_index`**:
    *   *Status*: Validated.
    *   *Governance Rule*: AI recommendation scores are stored with multi-layered tracking (Deterministic, Semantic, Recruiter Override). Scoping is enforced so vendors only see matches relevant to their candidates.
*   **`ai_execution_ledger` & `ai_gateway_cache`**:
    *   *Status*: Validated.
    *   *Governance Rule*: Integrated into the `AIGateway` to support centralized tracking of prompt versions, models, latencies, tokens, and estimated financial costs. Uses SHA-256 caching of normalized prompts to prevent stale output.

---

## Consolidation Roadmap & Status

To achieve pristine database structure, the following Tier 3 migrations are executed:

```text
PHASE 1 (Completed)  : Unify requirements visibility; eliminate requirements_public/private.
PHASE 2 (In Progress): Migrate all log streams (error_monitoring_logs) to central system_logs.
PHASE 3 (Upcoming)   : Run background sweep script to purge deprecated metadata collections.
```

---

## Remediation Guidelines (For Developers & AI Agents)

1.  **NEVER** build queries that scan `candidatePool` or any collection without an `orgId` or `vendorId` index filter unless executed by an HQ Administrator.
2.  **NEVER** define hardcoded arrays inside dashboard visualizers. If a stat cannot be compiled from the matching database, surface an active warning rather than mocking data.
3.  **NEVER** bypass the `AIGateway` to contact Gemini, Ollama, or OpenAI directly. Every request must be routed through the gateway using a certified capability.
