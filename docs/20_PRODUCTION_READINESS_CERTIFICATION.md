# HireNestOS Production Readiness Certification

## Strategic Assessment

The greatest risk to moving forward is not a lack of AI features, but regressions in **data integrity, ownership integrity, lifecycle integrity, and multiple sources of truth**. The focus for the immediate roadmap is strictly on **Production Readiness Certification**, postponing any net-new AI capability development (such as autonomous recruiting, AI interviewing, or revenue forecasting) until the core engine is certified.

## The Production Readiness validation MUST pass the following 6-Stage Gate for every release:

### Stage 1: Product Manager Auditor

- **Focus:** UX consistency, counts, lifecycle states, workflows.
- **Checks:**
  - Are candidate counts matching correctly between Requirement 360 and the Dashboard?
  - Do the workflows logically proceed from Matched -> Submitted -> Shortlisted -> Interview -> Offer?
  - Are states clearly communicated to users in the UI?

### Stage 2: Software Architect Auditor

- **Focus:** Collections, ownership, state transitions.
- **Checks:**
  - Are we using the singular source of truth for candidate placement status?
  - Does ownership correctly transfer or persist across the workflow?
  - Do state machines prevent invalid transitions (e.g., Offer Accepted before Offer Released)?

### Stage 3: Firestore Auditor

- **Focus:** Queries, indexes, rules.
- **Checks:**
  - Are Security Rules preventing cross-tenant data leakage?
  - Do all queries limit data natively (`where("vendorId", "==", orgId)`) instead of relying on client-side filtering?
  - Are required composite indexes defined, ensuring no query drops out or performs full collection scans unexpectedly?

### Stage 4: Governance Auditor

- **Focus:** Soft-deletion, visibility, tenant isolation.
- **Checks:**
  - When a candidate is soft-deleted, do they vanish globally from searches, matches, and ledger tables?
  - Can a Vendor ONLY see their own candidates and their own submissions?
  - Can a Client ONLY see candidates submitted to their active requirements?

### Stage 5: Security Auditor

- **Focus:** Authentication, authorization, data leakage.
- **Checks:**
  - Is the `ownerVendorId` enforced and mutation-protected by Firestore Rules?
  - Are `user` claims validated on backend APIs?
  - Do APIs strictly scope return payloads to the authorized principal?

### Stage 6: AI Matching Auditor

- **Focus:** Scores, matching, recommendations.
- _Only validated after everything else passes._
- **Checks:**
  - Layer 1 (Deterministic): Skills, Experience, Location, Domain, Certifications.
  - Layer 2 (Semantic): Used only for skill inference and trajectory projection.
  - Layer 3 (Override): Ensure Recruiter overrides the AI layer definitively.

## Mandatory Certification Milestones

Before HireNestOS goes live, we must certifiy the following end-to-end:

### 1. Candidate Lifecycle Certification

- Included: Added → Matched → Submitted → Shortlisted → Interview → Offer → Joined → Placement → Invoice → Payment.

### 2. Multi-Tenant Validation Certification

- Included:
  - Vendor A data is strictly separated from Vendor B data.
  - Client view operates efficiently and doesn't bleed data.
  - Recruiter view respects role-base controls.
  - HQ Admin / Super Admin maintains global oversight and override authority securely.

### 3. Data Integrity Validation Certification

- Included: Create, Update, Soft-Delete, Restore, Merge, Transfer Ownership.

### 4. Revenue Validation Certification

- Included: Placement, Invoice, Collection, Margin, and Vendor Payout tracking.
