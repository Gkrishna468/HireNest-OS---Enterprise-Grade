# HN-013: Live Runtime Certification Specification
**Document Owner:** Principal Software Architect & Operations Center Lead  
**Target Milestone:** HN-013 (Live Operational Observability & Pilot Readiness)  
**System Status:** Runtime v1.0 FROZEN

---

## 1. Scope & Objectives
This specification establishes the strict operational boundaries, test matrix, and audit compliance logs for the HireNestOS Mission Control Center. 

Under the Runtime v1.0 code-freeze mandate, this milestone introduces **zero** new business workflows, candidate schemas, or AI model endpoints. Instead, it transitions the existing system from simulated demonstration structures to direct, real-time observation of Firestore-backed runtime operations.

---

## 2. Acceptance Criteria
To achieve Production Readiness Certification, the Mission Control UI and the underlying backend engine must satisfy the following:
1. **Observation-Only Rule:** The default Operations views (Mission Control) must never trigger fake, hardcoded, or simulated events. All numbers, statuses, and heartbeats must load dynamically from real-time Firestore database listeners (`system_runtime/state` and `system_logs`).
2. **Strict Module Separation:** All developer/engineering controls—including the Event Simulator, Chaos Tester, Feature Flag override engine, and direct Queue Replay tools—must reside exclusively within the restricted **Engineering Console** sub-view.
3. **KPI Completeness:** The operations room must surface exact telemetry for:
   - **Runtime health** (Uptime, State, Heartbeats)
   - **Event streams** (Volume today, Events/sec, Queue depth)
   - **AI Gateway budgets** (Gemini latency, Total calls, Budget consumption, Errors)
   - **Offices** (Operational states, current task bindings)
4. **Chronological Runtime Timeline:** A persistent historical audit log of exact event-state transitions with millisecond precision must be visible to operators.

---

## 3. Test & Certification Matrix

The following transaction paths must execute end-to-end and successfully stream live telemetry, state progression, and trace events into the console without manual intervention:

| Test Case | Business Action | Event Handlers Triggered | Operational Console Verification |
| :--- | :--- | :--- | :--- |
| **TC-01** | Create Requirement | `REQUIREMENT_CREATED` | Event Bus receives event → Matching Office goes `PROCESSING` → Recruitment Office transitions to active match. |
| **TC-02** | Upload Candidate Resume | `RESUME_UPLOADED` | Recruitment Office starts Gemini extraction pipeline → Core Talent Pool incremented. |
| **TC-03** | System Rule Trigger | `RULE_TRIGGERED` | Automation Engine processes conditions → Suspends for approval or pushes Slack alert. |
| **TC-04** | Dispatch Interview | `INTERVIEW_CREATED` | SLA scheduling engine registers heartbeat and locks calendar room. |
| **TC-05** | Issue Placement Contract | `OFFER_RELEASED` | Pro-forma draft generated, workflow progress increments. |
| **TC-06** | Invoice Generation | `INVOICE_CREATED` | GST/Invoice calibrator updates financial ledger. |
| **TC-07** | Poison Event Injection | `DLQ_INJECTION` | Transaction fails with unrecoverable error → Safely routed to Dead Letter Queue (DLQ). |
| **TC-08** | DLQ Manual Replay | `DLQ_REPLAY_REQUEST` | Operator triggers replay → Retransmitted through Event Bus → Core state resolves. |

---

## 4. Feature Flag Governance & Approval Flow
Any modification to live operational parameters (Feature Flags) must clear the following state machine:

```text
  [Operator Toggle Click] 
            │
            ▼
   [PENDING APPROVAL] ──(Operator Review)──► [APPROVE & APPLY]
            │                                       │
            ▼ (Cancel)                              ▼ (Launches Rollback Timer)
       [REJECTED]                              [ACTIVE RUNTIME] 
                                                    │
                                                    ▼ (Timer Expires)
                                              [AUTO-ROLLBACK]
```

- **Rollback Protection:** If a feature flag is flagged with an active auto-rollback timer (e.g., 5 min), the background daemon reverts the flag automatically to prevent system-wide lockouts if the operator becomes unresponsive or downstream systems drift.

---

## 5. Non-Goals
The following actions are strictly out of scope for this milestone:
- Modifying the underlying database schema (`src/db/schema.ts`) or Firestore rule models.
- Adding unrequested AI models (like Claude or GPT-4) or changing the model alias configuration.
- Building custom visualizers that do not map directly to live system collections.

---

## 6. Rollback Strategy
If any production system experiences performance degradation or deadlocks as a result of active monitoring subscription handles:
1. Revert active real-time snapshot listeners to low-frequency polling.
2. Disable the Event Replay telemetry buffer in the Engineering Console.
3. Fallback to native client-side local cache structures to preserve browser memory.
