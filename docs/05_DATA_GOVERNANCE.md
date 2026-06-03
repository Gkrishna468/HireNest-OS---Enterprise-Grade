# Data Governance Document

## Mock Data Prohibition (Enterprise Validation Rule)
- **NO MOCK DATA IN PRODUCTION OR STAGING**.
- All dashboards, analytics, AI scoring, adoption metrics, benchmarks, executive reports, and operational intelligence modules **must derive exclusively from Firebase** as the system of record.
- Hardcoded arrays (e.g. `const data = [...]`) or random number generators (`Math.random()`) for metrics are strictly prohibited unless explicitly marked for development only and excluded from production builds.

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

## Recommendation Isolation
All recommendation engines, matching engines, strategic routing modules, AI scoring modules, and requirement intelligence panels MUST operate ONLY on the authorized candidate universe for the current tenant. No module may directly scan the global `candidatePool` without tenant scoping (`where("vendorId", "==", orgId)` or `where("clientId", "==", orgId)`), except for legitimate operations performed under Admin constraints (`role === "admin" | "super_admin" | "ops_admin"`).

# Workspace Access Rules

This workspace rules define a non-negotiable governance model for HireNestOS. Every query, AI match, dashboard KPI, notification, submission, interview, and recommendation MUST obey these rules.

## 1. Admin HQ Workspace Rule
- **Purpose**: Global platform control and governance.
- **Can See**: All Vendors, All Clients, All Recruiters, All Candidates, All Requirements, All Submissions, All Interviews, All Placements, All Ownership Claims, All Event Ledger Records, All Analytics.
- **Can Do**: Create/Edit/Delete Organizations, Override Ownership Claims, Approve Vendor Delete Requests, Manage Users, Reassign Requirements, Resolve Disputes, Audit AI Decisions.
- **AI Matching Scope**: Entire `candidatePool`, Entire `requirements_public`, Entire `submissions`.
- **Dashboard**: Global metrics only (e.g., Total Candidates, Total Vendors, Total Clients, Total Placements, Total Revenue).

## 2. Vendor Workspace Rule
- **Purpose**: Manage vendor bench and supply talent.
- **Can See**: Their own candidates, Their own submissions, Their own interviews, Their own placements, Requirements assigned to them, Requirements opened for vendor network.
- **Cannot See**: Other vendor candidates, Other vendor submissions, Other vendor interviews, Other vendor placements, Ownership claims belonging to others.
- **Candidate Scope**: `candidate.vendorId == currentVendorId` or `ownershipVault.ownerOrgId == currentVendorId`.
- **AI Matching Scope**: When opening a Requirement, the system ONLY matches against the Vendor's Bench. NEVER the global candidate pool.
- **Dashboard**: Vendor-specific Bench Candidates, Mapped Candidates, Submitted Candidates, Interviews, Placements, Revenue.

## 3. Client Workspace Rule
- **Purpose**: Review talent and hire candidates.
- **Can See**: Their requirements, Candidates submitted to their requirements, Interview pipeline, Offer pipeline, Placement pipeline.
- **Cannot See**: Vendor bench, Global candidates, Other client requirements, Ownership data, Vendor internal notes.
- **Candidate Scope**: ONLY `submissions WHERE clientId == currentClient`.
- **AI Matching Scope**: Clients NEVER see global AI recommendations. They only see Submitted Candidates already routed through governance.
- **Dashboard**: Active Requirements, Pending Reviews, Interviews, Offers, Hires, Time To Hire for that client.

## 4. Recruiter Workspace Rule
- **Purpose**: Source, qualify, match, submit (operate as a Talent Operator).
- **Can See**: Depends on organization.
  - **Recruiter under Vendor**: Can see their vendor's candidates, submissions, interviews, and placements. Cannot see other vendor candidates.
  - **Recruiter under Admin HQ**: Can see the global talent universe because HQ owns governance.
- **Candidate Scope**: `role = recruiter AND orgId = currentOrg`.
- **AI Matching Scope**: Matches Candidates inside recruiter's organization (unless HQ recruiter).

## Golden Governance Rule
**Admin HQ** = Global Visibility
**Vendor** = Own Talent Universe
**Recruiter** = Organization Talent Universe
**Client** = Submitted Candidate Universe

No workspace may query `candidatePool`, recommendations, AI matches, submissions, interviews, or analytics outside its authorized universe.

If every service (Candidate 360, AI Matching, Strategic Routing, Requirements, Deal Rooms, Interviews, Analytics, Dashboards, Notifications) follows this rule, HireNestOS will remain secure and consistent across all multi-tenant boundaries.