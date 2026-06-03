# Data Governance Document

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
