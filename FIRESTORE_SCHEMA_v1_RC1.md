# HireNest Unified Operations Platform (UOP)
## Master Enterprise Firestore Schema Specification (v1-RC1)

This document serves as the frozen, authoritative database schema specification and governance manual for the HireNest UOP. From this point forward, every feature must strictly conform to this schema. No ad-hoc collections are permitted.

---

## 1. Architectural Blueprint: Shared Domain Model

CRM and OS are distinct systems of execution and intelligence consuming a single, unified domain model. The database is the single source of truth (SSOT). All applications are decoupled and interact asynchronously through `system_events`.

```text
                               Firestore (UOP)
                        =============================
                          ENTERPRISE DATA PLATFORM
                        =============================

                             Shared Domain Data
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
 organizations                      users                        requirements
   candidates                    submissions                      system_events
                               (and 18 others)
       
       ▲                                                             ▲
       │                                                             │
  HireNest CRM                                                  HireNest OS
(System of Execution)                                     (System of Intelligence)
```

---

## 2. Master Collection Directory

Below is the exhaustive registry of UOP collections organized into operational tiers:
- **Tier 1 (Core SSOT)**: Critical business entities. Immutable transaction log.
- **Tier 2 (UOP OS Runtime)**: Automations, operational queues, and AI-agent engines.
- **Tier 3 (Deprecated / Phased Out)**: Read-only or mapped to Tier 1/2. Purged in Phase 3.

---

### Collection 1: `organizations`
* **Purpose**: Top-level tenant boundaries separating clients, vendor agencies, and HireNest HQ.
* **Owner**: UOP Infrastructure Core
* **Read Permissions**: Authenticated users matching `request.auth.uid` associated with the organization (`user.organizationId == orgId`). HQ Admins have global access.
* **Write Permissions**: HQ Admins only.
* **Indexes**: 
  * Single-Field: `organizationId` (Ascending)
  * Composite: `type` + `status` (Ascending)
* **Required Fields**:
  * `organizationId`: `string` (Matches regex `^[a-zA-Z0-9_\-]+$`, size $\le 128$)
  * `companyName`: `string` (size $\le 255$)
  * `type`: `string` (`"client"` | `"vendor"` | `"internal"` | `"partner"`)
  * `status`: `string` (`"pending_review"` | `"approved"` | `"rejected"`)
  * `createdAt`: `timestamp` (Server time)
  * `ownerId`: `string`
* **Optional Fields**:
  * `domain`: `string`
  * `verificationTier`: `string` (`"Tier 1"` | `"Tier 2"` | `"Tier 3"`)
  * `ndaUploaded`: `boolean`
  * `msaUploaded`: `boolean`
  * `businessDocsUploaded`: `boolean`
  * `adminApproved`: `boolean`
* **Events Emitted**: `ORGANIZATION_CREATED`, `ORGANIZATION_STATUS_UPDATED`
* **Events Consumed**: None
* **Retention Policy**: Indefinite (Permanent Ledger)
* **Deprecation Status**: Active (Tier 1)

---

### Collection 2: `users`
* **Purpose**: User profiles associated with Firebase Authentication identities, integrating role claims and trust scores.
* **Owner**: Auth & Identity Service
* **Read Permissions**: Owner (`request.auth.uid == userId`) or HQ Admins. Client managers can read users within their own `organizationId`.
* **Write Permissions**: Owner (`request.auth.uid == userId`) for non-RBAC fields (e.g., displayName). HQ Admins can update all fields (role, status, scores). Self-role modification is strictly forbidden.
* **Indexes**:
  * Single-Field: `email` (Ascending), `organizationId` (Ascending)
* **Required Fields**:
  * `uid`: `string` (Matches `request.auth.uid`)
  * `email`: `string` (Verified email address format)
  * `role`: `string` (`"admin"` | `"client_hm"` | `"client_finance"` | `"client_recruiter"` | `"recruiter"` | `"operations"`)
  * `organizationId`: `string`
  * `createdAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `displayName`: `string`
  * `recruiterType`: `string` (`"internal"` | `"vendor"` | `"freelance"` | `"contract"`)
  * `verification`: `map` containing:
    * `emailVerified`: `boolean`
    * `identityVerified`: `boolean`
    * `bgvVerified`: `boolean`
    * `aadhaarVerified`: `boolean`
    * `businessVerified`: `boolean`
    * `trustScore`: `number`
    * `badgeType`: `string`
  * `identityDocs`: `map` containing:
    * `aadhaarMasked`: `string`
    * `documentUrl`: `string`
* **Events Emitted**: `USER_CREATED`, `USER_ROLE_UPDATED`, `USER_TRUST_SCORE_ADJUSTED`
* **Events Consumed**: None
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 1)

---

### Collection 3: `clients`
* **Purpose**: Business parameters, operational limits, and performance scores for hiring companies.
* **Owner**: CRM Account Service
* **Read Permissions**: HQ Admins, associated Client Managers, and assigned Vendor Recruiters.
* **Write Permissions**: HQ Admins or Client Owners (subject to SLA caps).
* **Indexes**:
  * Single-Field: `organizationId` (Ascending)
* **Required Fields**:
  * `id`: `string` (Foreign key pointing to `organizations.id`)
  * `name`: `string`
  * `slaTier`: `string` (`"standard"` | `"premium"` | `"enterprise"`)
* **Optional Fields**:
  * `industry`: `string`
  * `contactPerson`: `map` (`name`, `email`, `phone`)
  * `activeRequirementsCount`: `number`
  * `totalPlacements`: `number`
* **Events Emitted**: `CLIENT_SLA_TIER_CHANGED`
* **Events Consumed**: `PLACEMENT_COMPLETED` (increments placement counts)
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 1)

---

### Collection 4: `vendors`
* **Purpose**: Operational records and dynamically calculated performance metrics for third-party staffing agencies.
* **Owner**: Partner Engagement Service
* **Read Permissions**: HQ Admins, associated Client Managers, and the target Vendor's Recruiters.
* **Write Permissions**: HQ Admins only.
* **Indexes**:
  * Single-Field: `id` (Ascending), `performanceScore` (Descending)
* **Required Fields**:
  * `id`: `string` (Foreign key pointing to `organizations.id`)
  * `agencyName`: `string`
  * `performanceScore`: `number` (0.00 to 1.00)
* **Optional Fields**:
  * `contactPerson`: `map` (`name`, `email`)
  * `associatedRecruiters`: `array` of `string`
* **Events Emitted**: `VENDOR_PERFORMANCE_UPDATED`
* **Events Consumed**: `SUBMISSION_CREATED` (updates response latency), `PLACEMENT_COMPLETED`
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 1)

---

### Collection 5: `requirements`
* **Purpose**: Authoritative single source of truth representing job descriptions and openings. Mapped to a single record. **Legacy collections `requirements_public`, `requirements_private`, and `jobs` have been fully unified here.**
* **Owner**: Job Architecture Service
* **Read Permissions**: HQ Admins and Client Managers. For vendors, read is restricted to documents with `visibility.vendors == true` or targeted broadcast entries.
* **Write Permissions**: HQ Admins, and Client Managers belonging to the owner company (`orgId`).
* **Indexes**:
  * Composite: `clientId` + `status` (Ascending)
  * Composite: `visibility.public` + `status` (Ascending)
* **Required Fields**:
  * `requirementId`: `string` (Matches regex, size $\le 128$)
  * `clientId`: `string` (Fk to `organizations`)
  * `title`: `string`
  * `description`: `string`
  * `status`: `string` (`"Draft"` | `"Approved"` | `"Open"` | `"Closed"` | `"Filled"`)
  * `visibility`: `map` containing:
    * `public`: `boolean`
    * `vendors`: `boolean`
    * `clients`: `boolean`
    * `sharedVendorIds`: `array` of `string` (Optional targeted list)
  * `ownerId`: `string`
  * `createdAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `skills`: `array` of `string`
  * `experience`: `string`
  * `minExp`: `number`
  * `maxExp`: `number`
  * `vendorVisibleBudget`: `number`
  * `actualClientBudget`: `number` (Isolated on write and read using security rules)
  * `platformMargin`: `number`
  * `marginType`: `string` (`"fixed"` | `"percentage"`)
  * `broadcast`: `map` containing:
    * `status`: `string` (`"PENDING"` | `"PROCESSING"` | `"COMPLETED"`)
    * `lastBroadcastAt`: `timestamp`
    * `jobId`: `string`
* **Events Emitted**: `REQUIREMENT_CREATED`, `REQUIREMENT_UPDATED`, `REQUIREMENT_BROADCAST_TRIGGERED`
* **Events Consumed**: `SLA_BREACHED` (triggers escalations)
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 1)

---

### Collection 6: `candidates`
* **Purpose**: Master global registry of individual candidate profiles. **Candidate status is NOT stored here to prevent state drift; pipeline stage is tracked strictly in `submissions`.**
* **Owner**: Talent Operations Core
* **Read Permissions**: HQ Admins, and Vendor Recruiters who uploaded the record (`vendorId == recruiter.orgId`).
* **Write Permissions**: HQ Admins, or Vendor Recruiters uploading a candidate (requires strict duplicate hash check prior to commit).
* **Indexes**:
  * Single-Field: `resumeHash` (Ascending) for deduplication.
  * Composite: `vendorId` + `createdAt` (Descending)
* **Required Fields**:
  * `candidateId`: `string`
  * `fullName`: `string`
  * `resumeHash`: `string` (SHA-256 hash of plain text)
  * `resumeUrl`: `string`
  * `createdBy`: `string` (User ID of recruiter)
  * `vendorId`: `string` (Owner vendor organization ID)
  * `createdAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `primaryEmail`: `string`
  * `phoneHash`: `string`
  * `linkedin`: `string`
  * `skills`: `array` of `string`
  * `experienceYears`: `number`
  * `parsedData`: `map` (Complete structured JSON)
* **Events Emitted**: `CANDIDATE_CREATED`, `CANDIDATE_DEDUPLICATED`
* **Events Consumed**: None
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 1)

---

### Collection 7: `submissions`
* **Purpose**: Direct association between a Candidate and a Requirement, acting as the absolute authority for recruitment pipelines.
* **Owner**: Pipeline Orchestrator
* **Read Permissions**: HQ Admins, Client Managers assigned to the target requirement, and the Vendor Recruiter who submitted the candidate.
* **Write Permissions**: Vendor Recruiters (creation only), HQ Admins, and Client Managers (status updates).
* **Indexes**:
  * Composite: `requirementId` + `status` (Ascending)
  * Composite: `candidateId` + `status` (Ascending)
* **Required Fields**:
  * `submissionId`: `string`
  * `candidateId`: `string`
  * `requirementId`: `string`
  * `submittedBy`: `string` (User ID)
  * `vendorOrgId`: `string`
  * `clientOrgId`: `string`
  * `status`: `string` (`"Applied"` | `"Review"` | `"Interviewing"` | `"Offered"` | `"Accepted"` | `"Rejected"`)
  * `createdAt`: `timestamp` (Server time)
  * `updatedAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `timeline`: `array` of `maps` containing transitions:
    * `stage`: `string`
    * `timestamp`: `string`
    * `actorId`: `string`
  * `interviewStatus`: `string` (`"Scheduled"` | `"Completed"` | `"Failed"`)
  * `offerStatus`: `string` (`"Draft"` | `"Released"` | `"Declined"` | `"Accepted"`)
  * `joiningStatus`: `string` (`"Pending"` | `"Onboarded"` | `"NoShow"`)
* **Events Emitted**: `SUBMISSION_CREATED`, `SUBMISSION_STAGE_TRANSITIONED`, `SUBMISSION_HIRED`
* **Events Consumed**: `INTERVIEW_COMPLETED` (advances candidate)
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 1)

---

### Collection 8: `interviews`
* **Purpose**: Granular records of scheduling, feedback links, and statuses for individual evaluation rounds.
* **Owner**: Interview Scheduling Engine
* **Read Permissions**: HQ Admins, Interviewers, assigned Client Managers, and the submitting Vendor Recruiter.
* **Write Permissions**: Client Managers, HR Coordinators, or HQ Admins.
* **Indexes**:
  * Composite: `submissionId` + `scheduledAt` (Ascending)
* **Required Fields**:
  * `id`: `string`
  * `submissionId`: `string`
  * `candidateId`: `string`
  * `requirementId`: `string`
  * `roundNumber`: `number`
  * `scheduledAt`: `timestamp`
  * `status`: `string` (`"scheduled"` | `"completed"` | `"cancelled"` | `"rescheduled"`)
* **Optional Fields**:
  * `durationMinutes`: `number`
  * `interviewerEmails`: `array` of `string`
  * `meetingLink`: `string`
  * `feedback`: `string`
* **Events Emitted**: `INTERVIEW_SCHEDULED`, `INTERVIEW_COMPLETED`, `INTERVIEW_CANCELLED`
* **Events Consumed**: None
* **Retention Policy**: 5 Years (Audit compliance)
* **Deprecation Status**: Active (Tier 1)

---

### Collection 9: `placements` & `offers`
* **Purpose**: Ledger tracking job offers, accepted packages, fee calculations, and active start parameters.
* **Owner**: Finance Ledger Core
* **Read Permissions**: HQ Admins, Client Finance, and Vendor Owners.
* **Write Permissions**: HQ Admins and Client Finance.
* **Indexes**:
  * Single-Field: `submissionId` (Ascending)
* **Required Fields**:
  * `id`: `string`
  * `submissionId`: `string`
  * `clientId`: `string`
  * `vendorId`: `string`
  * `baseSalary`: `number`
  * `placementFeePercentage`: `number`
  * `invoiceGenerated`: `boolean`
  * `status`: `string` (`"pending_start"` | `"active"` | `"terminated"`)
  * `startDate`: `timestamp`
* **Optional Fields**:
  * `offerDetails`: `map`
* **Events Emitted**: `PLACEMENT_COMPLETED`, `PLACEMENT_TERMINATED`
* **Events Consumed**: None
* **Retention Policy**: 7 Years (Financial compliance)
* **Deprecation Status**: Active (Tier 1)

---

### Collection 10: `invoices` & `payments`
* **Purpose**: Standard accounts receivable records tracking bills and vendor payouts.
* **Owner**: Automated Revenue Guardian
* **Read Permissions**: HQ Admins, Client Finance, and Vendor Payout Owners.
* **Write Permissions**: HQ Admins and Client Finance.
* **Indexes**:
  * Composite: `clientId` + `status` (Ascending)
* **Required Fields**:
  * `id`: `string`
  * `placementId`: `string`
  * `clientId`: `string`
  * `vendorId`: `string`
  * `amount`: `number`
  * `status`: `string` (`"draft"` | `"sent"` | `"paid"` | `"overdue"` | `"written_off"`)
  * `dueDate`: `timestamp`
* **Optional Fields**:
  * `paidAt`: `timestamp`
* **Events Emitted**: `INVOICE_GENERATED`, `INVOICE_PAID`, `INVOICE_OVERDUE`
* **Events Consumed**: `PLACEMENT_COMPLETED` (automates invoice drafts)
* **Retention Policy**: 7 Years (Tax audit requirement)
* **Deprecation Status**: Active (Tier 1)

---

### Collection 11: `system_events`
* **Purpose**: Immutable platform event bus ledger, swallowing legacy `intake_events`, `intake_audit`, `workflowEvents`, and `execution_events`. All decoupled communications stem from here.
* **Owner**: Event Bus Architecture v1.0
* **Read Permissions**: Read-only for HQ Admins and internal microservices. No external client reads.
* **Write Permissions**: Internal server-side microservices and event gateway only. No client-side SDK writes.
* **Indexes**:
  * Composite: `eventName` + `timestamp` (Descending)
* **Required Fields**:
  * `eventId`: `string`
  * `eventName`: `string` (Must match authorized event types list)
  * `timestamp`: `timestamp` (Server time)
  * `actorId`: `string`
  * `orgId`: `string`
  * `payload`: `map` (Complete structured event context)
* **Optional Fields**:
  * `correlationId`: `string`
  * `traceId`: `string`
* **Events Emitted**: None (This IS the event emitter source)
* **Events Consumed**: None
* **Retention Policy**: 1 Year hot storage, then archived to Cold storage.
* **Deprecation Status**: Active (Tier 1)

---

### Collection 12: `notifications`
* **Purpose**: Direct recipient notification dispatch logs for push, web, and external SMS delivery mechanisms.
* **Owner**: Notifications Dispatcher
* **Read Permissions**: Owner (`request.auth.uid == userId`).
* **Write Permissions**: Server-side microservices only.
* **Indexes**:
  * Composite: `userId` + `read` + `timestamp` (Descending)
* **Required Fields**:
  * `id`: `string`
  * `userId`: `string` (Recipient User ID)
  * `title`: `string`
  * `message`: `string`
  * `type`: `string` (`"info"` | `"warning"` | `"alert"`)
  * `read`: `boolean`
  * `timestamp`: `timestamp` (Server time)
* **Optional Fields**:
  * `actionLink`: `string`
* **Events Emitted**: None
* **Events Consumed**: `SUBMISSION_STAGE_TRANSITIONED`, `INTERVIEW_SCHEDULED`, `SLA_BREACHED`
* **Retention Policy**: 90 Days
* **Deprecation Status**: Active (Tier 1)

---

### Collection 13: `requirement_match_index`
* **Purpose**: Holds authorized candidate evaluation scores, segregating scores by requirement and tenant.
* **Owner**: OS Matching Engine (Layer 1-3)
* **Read Permissions**: HQ Admins, associated Client Managers, and authorized Vendor Recruiters (restricted to their candidates).
* **Write Permissions**: Server-side OS Match Worker only.
* **Indexes**:
  * Composite: `requirementId` + `matchScore` (Descending)
* **Required Fields**:
  * `id`: `string` (Constructed as `${requirementId}_${candidateId}`)
  * `requirementId`: `string`
  * `candidateId`: `string`
  * `matchScore`: `number` (0.00 to 1.00)
  * `scoringLayers`: `map` containing:
    * `deterministic`: `number`
    * `semantic`: `number`
    * `override`: `number`
  * `updatedAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `reasons`: `array` of `string`
* **Events Emitted**: `MATCH_SCORE_DECLARED`, `MATCH_OVERRIDDEN`
* **Events Consumed**: `REQUIREMENT_UPDATED`, `CANDIDATE_CREATED` (triggers re-evaluation)
* **Retention Policy**: Mapped to requirement lifecycle (Purged 30 days after requirement close)
* **Deprecation Status**: Active (Tier 2)

---

### Collection 14: `candidate_inventory`
* **Purpose**: Tracks exclusive sourcing rights, benches, contractors, pods, and talent blocks assigned to specific vendors. Rebrands and expands `vendor_candidate_pool`.
* **Owner**: OS Allocation Engine
* **Read Permissions**: HQ Admins and the target Vendor Recruiter.
* **Write Permissions**: HQ Admins and target Vendor.
* **Indexes**:
  * Composite: `vendorId` + `claimedAt` (Descending)
* **Required Fields**:
  * `id`: `string`
  * `vendorId`: `string`
  * `candidateId`: `string`
  * `claimedAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `inventoryType`: `string` (`"Individual"` | `"Bench"` | `"Contractor_Pod"`)
  * `capacityCount`: `number`
  * `activeSla`: `string`
* **Events Emitted**: `CANDIDATE_INVENTORY_CLAIMED`, `CANDIDATE_INVENTORY_RELEASED`
* **Events Consumed**: None
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 2)

---

### Collection 15: `slas`
* **Purpose**: Performance and response tracking against client SLA parameters.
* **Owner**: SLA Guardian Engine
* **Read Permissions**: HQ Admins, associated Client Managers, and target Vendor Recruiter.
* **Write Permissions**: SLA background microservice only.
* **Indexes**:
  * Composite: `status` + `deadline` (Ascending)
* **Required Fields**:
  * `slaId`: `string`
  * `requirementId`: `string`
  * `type`: `string` (`"SUBMISSION"` | `"FEEDBACK"` | `"INTERVIEW"` | `"OFFER"`)
  * `deadline`: `timestamp`
  * `status`: `string` (`"OK"` | `"WARNING"` | `"BREACHED"`)
  * `breachTriggered`: `boolean`
* **Optional Fields**:
  * `dealId`: `string`
* **Events Emitted**: `SLA_BREACH_WARNING`, `SLA_BREACHED`
* **Events Consumed**: `SUBMISSION_CREATED` (resolves submission SLAs), `INTERVIEW_SCHEDULED` (resolves scheduling SLAs)
* **Retention Policy**: 2 Years
* **Deprecation Status**: Active (Tier 2)

---

### Collection 16: `system_logs`
* **Purpose**: Consolidates `error_monitoring_logs` and internal tracer tags to isolate system-wide diagnostics.
* **Owner**: UOP Infrastructure Core
* **Read Permissions**: HQ Admins only.
* **Write Permissions**: Server-side error monitoring framework only.
* **Indexes**:
  * Composite: `severity` + `timestamp` (Descending)
* **Required Fields**:
  * `logId`: `string`
  * `message`: `string`
  * `severity`: `string` (`"INFO"` | `"WARN"` | `"ERROR"` | `"CRITICAL"`)
  * `timestamp`: `timestamp` (Server time)
* **Optional Fields**:
  * `stackPreview`: `string`
  * `correlationId`: `string`
  * `traceId`: `string`
  * `sourceSystem`: `string`
* **Events Emitted**: `CRITICAL_ERROR_LOGGED` (triggers immediate push alerts to ops team)
* **Events Consumed**: None
* **Retention Policy**: 30 Days (Hot log rolling)
* **Deprecation Status**: Active (Tier 2)

---

### Collection 17: `system_runtime` & `system_health`
* **Purpose**: Telemetry parameters, system load levels, integration connection status, and model speed statistics.
* **Owner**: UOP Infrastructure Core
* **Read Permissions**: HQ Admins only.
* **Write Permissions**: Internal server-side diagnostics process only.
* **Indexes**:
  * Single-Field: `timestamp` (Descending)
* **Required Fields**:
  * `id`: `string`
  * `timestamp`: `timestamp` (Server time)
* **Optional Fields**:
  * `oauthFailures`: `number`
  * `runtimeErrors`: `number`
  * `eventBusBacklog`: `number`
  * `metrics`: `map`
* **Events Emitted**: None
* **Events Consumed**: None
* **Retention Policy**: 90 Days
* **Deprecation Status**: Active (Tier 2)

---

### Collection 18: `workflow_definitions` & `workflow_rules`
* **Purpose**: Configurable triggers, transitions, and rules driving automated recruitment processes (e.g., auto-rejections).
* **Owner**: OS Automation Studio
* **Read Permissions**: HQ Admins, associated Client Managers, and Vendor Recruiters.
* **Write Permissions**: HQ Admins only.
* **Indexes**:
  * Single-Field: `workflowId` (Ascending)
* **Required Fields**:
  * `workflowId`: `string`
  * `title`: `string`
  * `status`: `string` (`"active"` | `"inactive"`)
* **Optional Fields**:
  * `steps`: `array` of `map` objects
* **Events Emitted**: `WORKFLOW_CONFIG_CHANGED`
* **Events Consumed**: None
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 2)

---

### Collection 19: `planner_tasks` & `work_items`
* **Purpose**: Action items assigned directly to humans or virtual AI employees within the command center queues.
* **Owner**: OS Recruiter Command Center
* **Read Permissions**: HQ Admins, and assigned assignee (`owner == request.auth.uid`).
* **Write Permissions**: HQ Admins, assigned assignees, or virtual agents.
* **Indexes**:
  * Composite: `owner` + `status` + `deadline` (Ascending)
* **Required Fields**:
  * `id`: `string`
  * `title`: `string`
  * `owner`: `string` (User ID or Agent ID)
  * `status`: `string` (`"TODO"` | `"IN_PROGRESS"` | `"COMPLETED"`)
  * `priority`: `string` (`"High"` | `"Medium"` | `"Low"`)
  * `createdAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `category`: `string`
  * `deadline`: `timestamp`
  * `notes`: `string`
  * `nextAction`: `string`
  * `relatedEntityId`: `string`
* **Events Emitted**: `TASK_CREATED`, `TASK_COMPLETED`
* **Events Consumed**: `SUBMISSION_CREATED` (assigns initial verification tasks)
* **Retention Policy**: 1 Year after completion
* **Deprecation Status**: Active (Tier 2)

---

### Collection 20: `gmail_connections` & `mail_messages` & `mail_events`
* **Purpose**: Backs the asynchronous MailOS channel, capturing connection statuses and dispatched tracking pixels.
* **Owner**: MailOS Engine
* **Read Permissions**: HQ Admins and the specific connected Recruiter user.
* **Write Permissions**: Server-side MailOS handler only.
* **Indexes**:
  * Composite: `recruiterId` + `timestamp` (Descending)
* **Required Fields**:
  * `id`: `string`
  * `recruiterId`: `string`
  * `status`: `string` (`"CONNECTED"` | `"DISCONNECTED"` | `"EXPIRED"`)
* **Optional Fields**:
  * `watchExpiration`: `timestamp`
* **Events Emitted**: `MAIL_RECEIVED`, `MAIL_BOUNCED`, `LINK_CLICKED`
* **Events Consumed**: None
* **Retention Policy**: 1 Year (Dispatched messages only)
* **Deprecation Status**: Active (Tier 2)

---

### Collection 21: `token_vault`
* **Purpose**: Isolated secure key storage for encrypted credentials (Gmail, calendar integrations, etc.). **Direct client reads/writes are mathematically blocked in firestore.rules.**
* **Owner**: Secret Management Core
* **Read Permissions**: Server-side integration gateway only. (Completely blocked in client-side Firestore Rules).
* **Write Permissions**: Server-side integration gateway only. (Completely blocked in client-side Firestore Rules).
* **Indexes**:
  * Single-Field: `id` (Ascending)
* **Required Fields**:
  * `id`: `string` (Constructed as `org_${orgId}` or `user_${userId}`)
  * `encryptedTokens`: `string` (AES-256-GCM cipher payload)
  * `iv`: `string`
  * `updatedAt`: `timestamp` (Server time)
* **Optional Fields**: None
* **Events Emitted**: `CREDENTIAL_ROTATED`
* **Events Consumed**: None
* **Retention Policy**: Indefinite
* **Deprecation Status**: Active (Tier 2)

---

### Collection 22: `broadcast_jobs` (New)
* **Purpose**: Master orchestration record representing a requirement broadcast out to multiple messaging channels.
* **Owner**: OS Broadcast Service
* **Read Permissions**: HQ Admins and the Client Manager owning the underlying requirement.
* **Write Permissions**: HQ Admins or automated background workers.
* **Indexes**:
  * Composite: `requirementId` + `status` (Ascending)
* **Required Fields**:
  * `jobId`: `string`
  * `requirementId`: `string`
  * `status`: `string` (`"PENDING"` | `"RUNNING"` | `"COMPLETED"` | `"FAILED"`)
  * `createdAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `deliverySummary`: `map` (`totalCount`, `successCount`, `failedCount`)
* **Events Emitted**: `BROADCAST_JOB_TRIGGERED`, `BROADCAST_JOB_COMPLETED`
* **Events Consumed**: `REQUIREMENT_BROADCAST_TRIGGERED`
* **Retention Policy**: 180 Days
* **Deprecation Status**: Active (Tier 2)

---

### Collection 23: `broadcast_deliveries` (New)
* **Purpose**: Tracks granular, individual message delivery statuses (Email, WhatsApp, LinkedIn, etc.) for each targeted vendor.
* **Owner**: Messaging Gateway Core
* **Read Permissions**: HQ Admins, associated Client Managers, and the target Vendor Recruiter recipient.
* **Write Permissions**: Server-side broadcast workers.
* **Indexes**:
  * Composite: `jobId` + `vendorId` + `channel` (Ascending)
* **Required Fields**:
  * `deliveryId`: `string`
  * `jobId`: `string` (Fk to `broadcast_jobs`)
  * `vendorId`: `string`
  * `channel`: `string` (`"email"` | `"whatsapp"` | `"linkedin"`)
  * `status`: `string` (`"QUEUED"` | `"SENT"` | `"DELIVERED"` | `"FAILED"`)
  * `updatedAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `errorMessage`: `string`
  * `trackingToken`: `string` (Used for link tracking and read receipts)
* **Events Emitted**: `DELIVERY_COMPLETED`, `DELIVERY_FAILED`
* **Events Consumed**: None
* **Retention Policy**: 90 Days
* **Deprecation Status**: Active (Tier 2)

---

### Collection 24: `integration_status` (New)
* **Purpose**: Central health and connectivity tracker for platform connection lines (Gmail, WhatsApp, LinkedIn, Calendars, Outlook).
* **Owner**: Integration Health Watcher
* **Read Permissions**: HQ Admins only.
* **Write Permissions**: Server-side health checker.
* **Indexes**:
  * Single-Field: `provider` (Ascending)
* **Required Fields**:
  * `integrationId`: `string` (e.g., `gmail_hq`)
  * `provider`: `string` (`"gmail"` | `"whatsapp"` | `"linkedin"` | `"google_calendar"` | `"outlook"`)
  * `status`: `string` (`"ONLINE"` | `"OFFLINE"` | `"DEGRADED"`)
  * `lastCheckedAt`: `timestamp` (Server time)
* **Optional Fields**:
  * `latencyMs`: `number`
  * `errorTrace`: `string`
* **Events Emitted**: `INTEGRATION_OFFLINE` (triggers immediate operations alert)
* **Events Consumed**: `CREDENTIAL_ROTATED`
* **Retention Policy**: 30 Days (Rolling statistics)
* **Deprecation Status**: Active (Tier 2)

---

## 3. Tier 3 - Phased Out & Consolidated Registry

To prevent schema fragmentation, the following collections have been marked as **Deprecated / Frozen**. No future writes are permitted on these collections:

| Deprecated Collection | Resolution Status | Replacement / Consolidated Location |
| :--- | :--- | :--- |
| `requirements_public` | ❌ Frozen | Mapped to `requirements` with `visibility.public = true` |
| `requirements_private` | ❌ Frozen | Mapped to `requirements` with `visibility.vendors = true` |
| `jobs` | ❌ Purged | Replaced fully by the unified `requirements` collection. |
| `validation_results` | ❌ Consolidated | Stored inside `system_runtime` meta dictionaries. |
| `intake_metrics` | ❌ Consolidated | Stored inside `system_runtime` operational metrics. |
| `intake_events` | ❌ Consolidated | Swallowed into the immutable `system_events` ledger. |
| `intake_audit` | ❌ Consolidated | Swallowed into the immutable `system_events` ledger. |
| `ingestion_telemetry` | ❌ Consolidated | Merged into `system_runtime` connection records. |
| `error_monitoring_logs` | ❌ Consolidated | Merged into the central `system_logs` collection. |
| `event_subscriptions` | ❌ Consolidated | Relocated to `system_event_subscriptions`. |
| `workflowEvents` | ❌ Consolidated | Swallowed into the immutable `system_events` ledger. |
| `execution_events` | ❌ Consolidated | Swallowed into the immutable `system_events` ledger. |
| `ownership_audit_log` | ❌ Consolidated | Swallowed into the immutable `system_events` ledger. |
| `oauth_debug` | ❌ Purged | Completely removed from production (Development logs only). |
| `jd_cache` | ❌ Purged | Replaced with `ai_gateway_cache` managed by the AIGateway. |

---

## 4. Governance Policies

1. **The Invariant Rule**: There is absolutely **no** pipeline stage tracking allowed inside `candidate` profiles (e.g., `candidate.status = "Interview"` is strictly forbidden). Candidate state is completely stateless; pipelines belong solely to `submissions.status`.
2. **Strict SHA-256 Resume Deduplication**: Before a record is written to `candidates`, a SHA-256 hash of the sanitized text is validated. Duplicate attempts raise an immediate collision block.
3. **Implicit vs Explicit Security**: No client application is trusted to apply filters (such as `where("clientId", "==", currentOrgId)`). Security rules inside `firestore.rules` must explicitly evaluate incoming and existing payloads (`resource.data.orgId == request.auth.token.orgId`) to reject unauthorized scraping.

---

*Spec finalized and locked. Approved for deployment on UOP Architecture v2.0.*
// ponytail: baseline frozen data spec. No ad-hoc collections.
