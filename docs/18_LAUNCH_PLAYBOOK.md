# Launch Playbook

This document serves as the human operating manual for HireNestOS, guiding the onboarding of the first cohort of users and outlining critical operational procedures.

## 1. First Vendor Onboarding
- **Pre-flight Check:** Verify vendor organization exists in Firebase (`organizations` collection).
- **Communication:** Send welcome email with login credentials and a link to the Vendor Partner Workspace.
- **Orientation:** Schedule a 30-minute walkthrough focusing on:
  - Resume Parsing & Uploads.
  - Candidate 360 & AI Match Scores.
  - The Ownership Vault and candidate locking rules.
- **Monitoring:** Monitor their first 5 candidate uploads via the Event Ledger. Ensure parsing and semantic embedding generation complete successfully without edge-case failures. 

## 2. First Recruiter Onboarding
- **Pre-flight Check:** Ensure user profile is registered with `role: recruiter`.
- **Communication:** Send system access instructions.
- **Orientation:** Focus on:
  - Sourcing from the Global Candidate Pool.
  - Interpreting Match Scores and providing AI Feedback (Accept/Reject).
  - Client Deal Room creation and submission formatting.
- **Monitoring:** Track Daily Active Usage (DAU) and ensure they are actively reviewing matches and transitioning candidate statuses.

## 3. First Client Onboarding
- **Pre-flight Check:** Verify client organization exists in `organizations`.
- **Communication:** Send portal access link.
- **Orientation:** Keep it minimal and intuitive:
  - Viewing the Deal Room for their open requirements.
  - Approving, rejecting, or scheduling interviews for shortlisted candidates.
- **Monitoring:** Monitor Client Analytics for drop-offs (e.g., viewing candidates but not responding within 48 hours).

## 4. Support Escalation Process
- **L1 (General Inquiries/How-tos):** Handled by Customer Success / Account Management.
- **L2 (Data Discrepancies/Failed Parses):** Escalated to Technical Operations. Verify source documents against Firestore states.
- **L3 (System Outages/Security Events):** Escalated immediately to HQ Engineering. Trigger Production Incident Process.

## 5. Ownership Dispute Resolution
- **Detection:** Disputed claims automatically flagged in the Evidence Dashboard / Ownership Vault.
- **Investigation:** 
  - HQ Admin reviews the Audit Log timeline in the `ownershipVault` collection.
  - Verify timestamp, extraction accuracy, and communication traces.
- **Resolution:** HQ Admin manually sets ownership flag and resolves the status. Document the heuristic failure if AI misallocated ownership initially to improve rules.

## 6. Production Incident Process
- **Detection:** Automated alerts on high query latency, component mounting failures, or elevated 5xx error rates.
- **Triage:** Assess blast radius (Single Vendor vs. Global).
- **Communication:** Post status update to `#hq-ops` slack/teams channel.
- **Mitigation:** Execute hotfix or Rollback Procedure.
- **Post-Mortem:** Document root cause, resolution time, and update Governance Automation scripts to catch similar vectors.

## 7. Rollback Procedure
- **Trigger:** Failed production release blocking critical paths (e.g., Submissions or Logins).
- **Execution:** 
  1. Revert Git tag/deployment to the previous stable release.
  2. Verify database schema compatibility (if migrations were part of the failed release, isolate affected collections).
  3. Flush cloud caches.
- **Validation:** Monitor Event Ledger to ensure `UserLoggedIn` and `CandidateSubmitted` operations resume normally.

## 8. Daily Operations Checklist
- [ ] **Review Founder Control Tower:** Check Marketplace Signals (Submissions/Placements).
- [ ] **Review Evidence Dashboard:** Verify no Split-Brain risks or Architecture Violations.
- [ ] **Audit Dispute Queues:** Check the Ownership Vault for any pending conflicts.
- [ ] **Monitor AI Feedback:** Ensure AI Acceptance Rate is tracking above baseline and Hallucination Rates remain near zero.
- [ ] **Vendor Health Check:** Identify any Vendor partners with 0 submissions in the last 72 hours and trigger proactive outreach.
