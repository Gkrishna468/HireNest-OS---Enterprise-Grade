# Data Governance Document

## Mock Data Prohibition (Enterprise Validation Rule)
- **NO MOCK DATA IN PRODUCTION OR STAGING**.
- All dashboards, analytics, AI scoring, adoption metrics, benchmarks, executive reports, and operational intelligence modules **must derive exclusively from Firebase** as the system of record.
- Hardcoded arrays (e.g. `const data = [...]`) or random number generators (`Math.random()`) for metrics are strictly prohibited unless explicitly marked for development only and excluded from production builds.

## Source of Truth
- **Candidate Pipeline Stage**: The absolute source of truth is `submissions.status`.
- **Candidate Metadata (Name, Exp, Skills)**: Source of truth is `candidatePool`.
- **Interaction History**: Source of truth is `eventLedger`.

## Drift Prevention
- **NO duplicate state fields**. Do not store `pipelineStage` directly inside `candidatePool` if it represents a requirement-specific progress. We strictly infer the pipeline from `submissions`.
- For legacy drift issues, migration functions sweep `candidatePool.pipelineStage` to map to existing `submissions`.

## Record Lifecycle
- Candidates are archived, never hard-deleted to preserve history and deduplication hashes.
- `eventLedger` events are perpetually retained for auditing.

## Recommendation Isolation
All recommendation engines, matching engines, strategic routing modules, AI scoring modules, and requirement intelligence panels MUST operate ONLY on the authorized candidate universe for the current tenant. No module may directly scan the global `candidatePool` without tenant scoping (`where("vendorId", "==", orgId)` or `where("clientId", "==", orgId)`), except for legitimate operations performed under Admin constraints (`role === "admin" | "super_admin" | "ops_admin"`).
