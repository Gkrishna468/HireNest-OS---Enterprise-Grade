---
title: Workflow Catalog
version: 1.0.0
last_updated: 2026-06-29
status: active
---

# Workflow Catalog

Workflows represent long-running distributed transactions (Sagas) managed by the `WorkflowEngine`.

## 1. Candidate Sourcing Workflow (`candidate-sourcing-flow`)
Initiated when a Requirement is created.

**Steps**:
1. `EVALUATE_MATCHES`: Identifies immediate potential matches.
2. `RECOMMEND_RECRUITER`: Assigns or suggests a primary recruiter.
3. `BROADCAST_TO_VENDORS` (Optional): If SLA is urgent, pings vendors.
4. `NOTIFY_TEAM`: Alerts internal stakeholders.

**Compensation**:
- If `BROADCAST_TO_VENDORS` fails, logs alert to DLQ and downgrades vendor score temporarily.

## 2. Submission Pipeline Workflow (`submission-pipeline`)
Initiated when a Candidate is submitted to a Requirement.

**Steps**:
1. `VALIDATE_SUBMISSION`: Ensures required fields and formatting.
2. `INTERNAL_REVIEW`: Recruiter approves/rejects (Human Task).
3. `SUBMIT_TO_CLIENT`: Send payload to Client portal/email.
4. `AWAIT_CLIENT_FEEDBACK`: Suspends workflow until client responds.

**Compensation**:
- If `SUBMIT_TO_CLIENT` fails (e.g., mail bounce), sets status back to `INTERNAL_REVIEW` and creates a human task.

## 3. Offer Generation Workflow (`offer-generation`)
Initiated upon `OFFER_RELEASED`.

**Steps**:
1. `DRAFT_OFFER`: Generates documentation.
2. `INTERNAL_APPROVAL`: HR/Finance approval.
3. `SEND_OFFER`: Sends to candidate.
4. `AWAIT_SIGNATURE`: Suspend.

**Compensation**:
- If candidate declines, logs feedback to `ExperienceEngine` and re-opens sourcing workflow.
