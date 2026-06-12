# SLA Architecture & Governance

## Overview

As HireNestOS transitions towards Phase 5 (Temporal Workflow Execution) and AI-Agent governance, we require a strict Service Level Agreement (SLA) Architecture. 

The SLA Architecture dictates the maximum allowed time for operational activities and the automated escalations that execute when those thresholds are breached. SLAs ensure that the marketplace remains liquid, responsive, and high-quality.

## Core Timing Windows

The system enforces specific operational windows based on entity lifecycles.

### Vendor SLA: Submission Performance
* **Requirement Shared to First Submission**: 48 hours.
  * *Trigger*: `REQUIREMENT_ASSIGNED`
  * *Consequence if breached*: Decrease in Vendor responsiveness score; automatic escalation alert to assigned Recruiter.
* **Interview Setup Action**: 24 hours.
  * *Trigger*: `INTERVIEW_REQUESTED`
  * *Consequence if breached*: Candidate lock warning; auto-escalation to Delivery Manager.

### Client SLA: Feedback & Movement
* **Initial Submission Feedback**: 72 hours.
  * *Trigger*: `SUBMISSION_CREATED`
  * *Consequence if breached*: Auto-reminder dispatched. If unhandled after 5 days, Submission is auto-archived softly.
* **Interview Feedback**: 48 hours.
  * *Trigger*: `INTERVIEW_COMPLETED` (or scheduled end time elapsed)
  * *Consequence if breached*: Deal Room AI bot prompts Client user. Recruiter is pinged to manually follow up.

### Candidate/Vendor SLA: Offer & Joining
* **Offer Acceptance**: 72 hours.
  * *Trigger*: `OFFER_EXTENDED`
  * *Consequence if breached*: Offer marked as stale; candidate pipeline status downgraded.
* **Pre-boarding Check-ins**: Periodic (T-30, T-15, T-7 days).
  * *Trigger*: `OFFER_ACCEPTED` + joining date offset.
  * *Consequence if breached*: Vendor flagged for risk of candidate drop-out.

## Temporal Workflow Mapping

Temporal will execute these automatically using its timer guarantees.

```text
Sequence Exampe:
[Event] REQUIREMENT_SHARED
        ↓
Start Workflow: VendorSubmissionSLA
        ↓
sleep(48 hours)
        ↓
Check SubmissionStore for submissions on Requirement
        ↓
If Count == 0:
   Dispatch Event: VENDOR_SLA_BREACHED
   Update Projection: Vendor Ratings
```

## Auto-Escalation Rules

1. **Level 1 (Warning)**: In-app notification to the responsible party (Vendor / Client).
2. **Level 2 (Escalation)**: Notification to the internal owner (Recruiter / Delivery Manager).
3. **Level 3 (Action)**: System state change (Auto-close, auto-reject, score penalty).

## AI Agent Integrations

In Phase 6, AI Agents will utilize SLA breach events to take proactive steps:
* Generate customized follow-up emails based on Deal Room context.
* Suggest alternative candidates from the pool when a vendor fails to deliver within 48h.
* Prompt recruiters with talking points when chasing client feedback.
