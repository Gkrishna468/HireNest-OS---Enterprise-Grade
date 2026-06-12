# Agent Execution Policies

This document defines the strict governance model for Artificial Intelligence (AI) agents operating within the HireNestOS environment. As the system scales and incorporates autonomous execution capabilities, these boundaries ensure agents act predictably, securely, and within defined boundaries.

## Core Principle: Deterministic Guardrails over Probabilistic Execution
AI models are probabilistic; however, the business processes they integrate with are deterministic. AI agents in HireNestOS are restricted from directly mutating core states without following strict event-driven contracts and passing defined approval gates.

## Agent Permissions & Boundaries

### AI Recruiter Agent (Sourcing & Screening)
**Domain Focus:** Candidate matching, semantic searching, schedule coordination.
*   **Allowed Execution (✓)**
    *   Initiate `CANDIDATE_RECOMMENDED` events.
    *   Create task reminders and notes for human recruiters.
    *   Draft preliminary interview feedback summaries (Draft only).
    *   Evaluate candidates against job descriptions (Compute match scores).
*   **Prohibited Execution (✗)**
    *   **Cannot** definitively reject candidates.
    *   **Cannot** dispatch offer letters.
    *   **Cannot** alter organizational SLA targets.

### AI Operations Agent (SLA Monitor)
**Domain Focus:** Workflow performance, vendor speed, client responsiveness.
*   **Allowed Execution (✓)**
    *   Detect stall patterns in `Submission` states.
    *   Trigger `_OVERDUE` and `_BREACHED` SLA escalation events.
    *   Automate vendor nudges and client reminder summaries.
*   **Prohibited Execution (✗)**
    *   **Cannot** terminate vendor contracts.
    *   **Cannot** approve or alter billing records.

### AI Security & Auditor Agent (Compliance)
**Domain Focus:** Identifying anomalous events and state transitions.
*   **Allowed Execution (✓)**
    *   Read DLQ logs to detect pattern failures.
    *   Generate anomaly alerts to system administrators on multiple failed workflow executions.
*   **Prohibited Execution (✗)**
    *   **Cannot** automatically replay events to avoid replay storms.
    *   **Cannot** rollback projections autonomously without admin approval.

## Approval Gates & Escapement Paths

Before any potentially destructive or user-visible external state transition occurs initiated by an AI Agent (e.g., sending feedback to a candidate), the agent must publish a `_PENDING_APPROVAL` domain event, which forces a human into the loop.

Automated pipelines may only bypass the human-in-the-loop if:
1. The execution operates strictly over SLA / Timer data (`slaWorker.ts`).
2. The risk profiling of the request defines it as informational only.

## Temporal Context Injections
Every action performed by an AI Agent must be explicitly tagged in the `TemporalContext`:

```typescript
TemporalContext {
  traceId: "system-generated-uuid",
  actorId: "system:ai-agent:recruiter", // Must clearly delineate AI origin
  tenantId: "contextual-client-or-vendor-id", 
  workflowId: "wf-abc...",
  requestId: "req-xxx-...",
  timestamp: Date.now()
}
```
This guarantees an immutable audit trail separating human recruiter decisions from autonomous AI operations.
