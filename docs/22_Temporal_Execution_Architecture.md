# Temporal Execution Architecture

This document outlines the distributed execution and autonomous operations model for HireNestOS using a Temporal-like worker runtime. This runtime moves the system from a reactive web-app to a proactive automation engine.

## Phase 5A: Temporal Worker Candidates

The runtime relies on dedicated workers polling/listening for task definitions and executing durable workflows.

1. **`submissionWorker.ts`**: Orchestrates parsing, candidate hydration, and routing logic asynchronously.
2. **`interviewWorker.ts`**: Manages state transitions, invites, and scoring timeouts.
3. **`offerWorker.ts`**: Handles document generation, signature tracking, and offer expiry.
4. **`slaWorker.ts`**: Global monitor for time-based breaches across all entities.

## Target Workflows

### 1. Interview SLA Workflow
* **Trigger**: `INTERVIEW_COMPLETED`
* **Flow**:
    1. Start 48h timer.
    2. Check feedback submission status.
    3. If Yes: Terminate workflow (Success).
    4. If No: Escalate to Hiring Manager / Recruiter.
    5. Emit: `INTERVIEW_FEEDBACK_OVERDUE`.

### 2. Vendor SLA Workflow
* **Trigger**: `JOB_PUBLISHED`
* **Flow**:
    1. Vendor has a 48h window to submit initial candidates.
    2. Check vendor submissions for the requirement.
    3. If None: Escalate to Vendor Account Manager.
    4. Emit: `VENDOR_SLA_BREACHED`.

### 3. Client Feedback Workflow
* **Trigger**: `SUBMISSION_RECEIVED` (Candidate Submitted)
* **Flow**:
    1. 72h Timer starts.
    2. Check if client has reviewed/shortlisted/rejected.
    3. If No response: Send reminder and escalate.
    4. Emit: `CLIENT_FEEDBACK_OVERDUE`.

## Resilience Patterns

### Temporal Retry Behavior
- All external calls (e.g., email dispatch, ATS sync) implement exponential backoff.
- Transient errors (network down) are retried endlessly up to a threshold.
- Non-retryable errors (400 Bad Request, semantic failures) immediately divert to compensation.

### Compensation Logic
If a distributed workflow fails midway (e.g., Deal Room created but interview scheduling fails), the worker triggers a compensation saga:
- `Cancel Scheduled Interview` -> `Archive Deal Room` -> `Revert Submission Status`.

### Workflow Cancellation
Explicit triggers can cancel running workflows. Example: If a candidate withdraws while the `Interview SLA Workflow` is ticking, the workflow receives a termination signal, cleaning up its timers.
