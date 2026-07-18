# ADR-004: Candidate Ownership & Pipeline

- **Date**: 2026-07-18
- **Status**: Accepted
- **Context**: Tracking a candidate's progress across multiple jobs (requirements) can lead to data corruption if the pipeline state is stored directly on the global Candidate object.
- **Decision**: Decouple the Candidate identity from the pipeline state. The `candidates` collection holds static profile data. The `submissions` collection holds the relational pipeline state (stage, feedback) between a candidate and a specific requirement.
- **Alternatives considered**:
  - Storing an array of `applied_jobs` inside the Candidate document (Rejected: Array limits, concurrency conflicts, and difficult querying).
- **Consequences**:
  - Prevents state drift.
  - Requires querying the `submissions` collection to determine a candidate's active pipeline status.
