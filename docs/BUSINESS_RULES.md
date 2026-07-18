# Business Rules

This document governs the core business logic of HireNest OS. Features must never be implemented in a way that accidentally violates these business rules.

1. **Candidate Ownership Rules**: Candidates uploaded by a specific organization belong to that organization. Global matching can view anonymized data, but explicit contact requires ownership or approved submissions.
2. **Vendor Ownership Rules**: Third-party agencies (vendors) can only view candidates they sourced and their own submissions. They cannot see client pipelines or other vendors' candidates.
3. **Submission Lifecycle**: A submission binds a Candidate to a Requirement. State transitions (Review -> Interview -> Offer) must strictly update this relational entity, not the candidate directly.
4. **Client Lifecycle**: Clients manage Requirements. They can view anonymized vendor submissions until they explicitly unlock them.
5. **Recruiter Permissions**: Internal recruiters have broad access to their organization's talent pool but must adhere to strict ABAC rules preventing cross-organization data leakage.
6. **Admin Permissions**: Admins have global observability and configuration rights but are subject to immutable audit logging for sensitive actions.
7. **Matching Rules**: AI Match scores must be deterministic and explainable. Recruiter overrides always supersede AI predictions.
8. **SLA Rules**: Vendor Service Level Agreements (SLAs) must be automatically calculated by the SLA Guardian Engine based on submission velocity and quality.
9. **Commission Rules**: Placements trigger commission logic bound to the originating vendor and the closing recruiter.
10. **Multi-tenant Isolation**: Strict Attribute-Based Access Control (ABAC) in `firestore.rules` ensures that `organizationId` boundaries are never crossed.
11. **Data Retention**: PII must be purged according to compliance schedules (e.g., GDPR).
12. **Audit Requirements**: All high-risk mutations (e.g., status changes, deletions) must be recorded in the immutable `system_events` or audit ledgers.
