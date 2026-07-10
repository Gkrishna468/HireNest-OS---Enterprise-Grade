# HireNest Unified Operations Platform (UOP)
## Master Enterprise Firestore Schema & Governance Blueprint

This document defines the authoritative, single source of truth (SSOT) for all database collections across the HireNest Unified Operations Platform (serving both the Recruiter CRM and the HireNestOS Command Center).

---

## 3-Tier Database Governance Framework

To optimize performance, maintain strict multi-tenant access control (ABAC), and prevent schema fragmentation, all Firestore collections are categorized into three operational Tiers.

```text
                  HIRENEST UNIFIED OPERATIONS PLATFORM
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   Tier 1 — Core SSOT    Tier 2 — OS Runtime    Tier 3 — Deprecated/Phased
 (Transaction Ledger)   (Agents & Automations)   (Consolidated to Tiers 1 & 2)
```

---

## Tier 1 – Core Business (SSOT)
These collections represent the permanent, business-critical transactional ledger of the enterprise. They are highly normalized, governed by rigid validation rules, and protected by strict multi-tenant security filters.

### 1. `organizations`
Represents the top-level tenant boundaries for clients, vendor agencies, or HQ.
*   **Schema**:
    ```typescript
    interface Organization {
      id: string;             // Unique organization ID
      name: string;           // Company or Agency name
      type: 'hq' | 'vendor' | 'client';
      domain: string;         // Business domain
      createdAt: string;      // ISO Timestamp
      updatedAt: string;      // ISO Timestamp
      status: 'active' | 'suspended';
      settings: {
        theme?: string;
        allowedDomains?: string[];
        defaultTerms?: string;
      };
    }
    ```

### 2. `users`
System profiles linked directly to Firebase Authentication identities.
*   **Schema**:
    ```typescript
    interface UserProfile {
      uid: string;            // Links to auth.uid
      email: string;
      displayName: string;
      orgId: string;          // Links to organizations.id
      role: 'admin' | 'vendor_recruiter' | 'client_manager' | 'hq_recruiter';
      permissions: string[];  // Granular ABAC permission tokens
      lastLogin: string;
      status: 'active' | 'inactive';
    }
    ```

### 3. `clients`
Metadata and parameters relating to client organizations hiring through the platform.
*   **Schema**:
    ```typescript
    interface Client {
      id: string;             // Links to organizations.id
      name: string;
      industry: string;
      contactPerson: {
        name: string;
        email: string;
        phone: string;
      };
      activeRequirementsCount: number;
      totalPlacements: number;
      slaTier: 'standard' | 'premium' | 'enterprise';
    }
    ```

### 4. `vendors`
Associated staffing agencies supplying talent through the system.
*   **Schema**:
    ```typescript
    interface Vendor {
      id: string;             // Links to organizations.id
      agencyName: string;
      performanceScore: number; // Evaluated dynamically via UOP
      contactPerson: {
        name: string;
        email: string;
      };
      associatedRecruiters: string[]; // User IDs belonging to this vendor
    }
    ```

### 5. `requirements`
*Note: A requirement IS a job. There is NO separate "jobs" collection. CRM and OS utilize this single unified collection.*
*   **Schema**:
    ```typescript
    interface Requirement {
      id: string;
      clientId: string;       // Owner Client orgId
      title: string;
      description: string;
      skills: string[];
      budget: {
        min: number;
        max: number;
        currency: string;
      };
      priority: 'high' | 'medium' | 'low';
      status: 'Draft' | 'Approved' | 'Open' | 'Closed' | 'Filled';
      visibility: {
        public: boolean;      // Replaces legacy requirements_public
        vendors: boolean;     // Replaces legacy requirements_private
        clients: boolean;
        sharedVendorIds?: string[]; // Targeted broadcast targets
      };
      metrics: {
        submissionsCount: number;
        interviewsCount: number;
        placementsCount: number;
      };
      createdAt: string;
      updatedAt: string;
    }
    ```

### 6. `candidates`
Authoritative master registry of all talent profiles. Derived directly from resumes.
*   **Schema**:
    ```typescript
    interface Candidate {
      id: string;
      vendorId: string;       // Submitting vendor agency ID (or 'hq')
      name: string;
      email: string;
      phone: string;
      skills: string[];
      experienceYears: number;
      resumeHash: string;     // SHA-256 for deduplication check
      resumeUrl: string;      // Storage bucket link
      parsedData: Record<string, any>; // Complete structured JSON output
      status: 'available' | 'placed' | 'do_not_contact';
      createdAt: string;
      updatedAt: string;
    }
    ```

### 7. `submissions`
The absolute source of truth for pipeline tracking, mapping, and interview progress.
*   **Schema**:
    ```typescript
    interface Submission {
      id: string;
      candidateId: string;
      requirementId: string;
      clientId: string;
      vendorId: string;
      recruiterId: string;
      status: 'Applied' | 'Review' | 'Interviewing' | 'Offered' | 'Accepted' | 'Rejected';
      interviewStatus?: 'Scheduled' | 'Completed' | 'Failed';
      interviewFeedback?: string;
      interviewRounds: number;
      offerStatus?: 'Draft' | 'Released' | 'Declined' | 'Accepted';
      joiningStatus?: 'Pending' | 'Onboarded' | 'NoShow';
      createdAt: string;
      updatedAt: string;
    }
    ```

### 8. `interviews`
Log of chronological interview events with granular scheduling blocks.
*   **Schema**:
    ```typescript
    interface Interview {
      id: string;
      submissionId: string;
      candidateId: string;
      requirementId: string;
      roundNumber: number;
      scheduledAt: string;
      durationMinutes: number;
      interviewerEmails: string[];
      meetingLink?: string;
      status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    }
    ```

### 9. `placements` & `offers`
Financial transactions and formal job offer ledgers.
*   **Schema**:
    ```typescript
    interface Placement {
      id: string;
      submissionId: string;
      candidateId: string;
      requirementId: string;
      clientId: string;
      vendorId: string;
      baseSalary: number;
      placementFeePercentage: number;
      invoiceGenerated: boolean;
      status: 'pending_start' | 'active' | 'terminated';
      startDate: string;
    }
    ```

### 10. `invoices` & `payments`
Standard double-entry accounts receivable records.
*   **Schema**:
    ```typescript
    interface Invoice {
      id: string;
      placementId: string;
      clientId: string;
      vendorId: string;
      amount: number;
      status: 'draft' | 'sent' | 'paid' | 'overdue' | 'written_off';
      dueDate: string;
    }
    ```

### 11. `system_events`
The unified immutable platform event bus ledger.
*   **Schema**:
    ```typescript
    interface SystemEvent {
      eventId: string;
      eventName: 'REQUIREMENT_CREATED' | 'REQUIREMENT_UPDATED' | 'RECRUITER_ASSIGNED' | 'CANDIDATE_MATCHED' | 'SUBMISSION_CREATED' | 'INTERVIEW_SCHEDULED' | 'OFFER_RELEASED' | 'PLACEMENT_COMPLETED';
      timestamp: string;
      actorId: string;        // User ID initiating change
      orgId: string;          // Org ID initiating change
      payload: Record<string, any>;
    }
    ```

### 12. `notifications`
Direct recipient messages across push/web channels.
*   **Schema**:
    ```typescript
    interface Notification {
      id: string;
      userId: string;
      title: string;
      message: string;
      type: 'info' | 'warning' | 'alert';
      read: boolean;
      timestamp: string;
    }
    ```

---

## Tier 2 – AI & OS Runtime (Operational Engine)
These collections drive real-time agent logic, integrations, task automation, and metrics tracking.

### 1. `requirement_match_index`
Authorized matching registry. Strictly isolates candidate scores by requirement and tenant.
*   **Schema**:
    ```typescript
    interface RequirementMatchIndex {
      id: string;             // `${requirementId}_${candidateId}`
      requirementId: string;
      candidateId: string;
      matchScore: number;     // Decimals (0.00 to 1.00)
      scoringLayers: {
        deterministic: number;
        semantic: number;
        override: number;
      };
      reasons: string[];
      updatedAt: string;
    }
    ```

### 2. `vendor_candidate_pool`
Tracks exclusive ownership and candidate sourcing allocations per vendor.
*   **Schema**:
    ```typescript
    interface VendorCandidatePool {
      id: string;
      vendorId: string;
      candidateId: string;
      activeSla: string;
      claimedAt: string;
    }
    ```

### 3. `system_runtime` & `system_health`
Holds status of active background processes, telemetry configurations, and server tasks.

### 4. `system_logs`
Centralized tracing and error taxonomies, replacing legacy `error_monitoring_logs`.

### 5. `workflow_definitions` & `workflow_rules`
Defines operational workflows, steps, and compliance conditions (SLAs).

### 6. `planner_tasks` & `work_items`
Tracks operational and collaborative actions assigned to human recruiters or AI workers.

### 7. `gmail_connections` & `mail_messages`
Manages the MailOS background communication layer.

---

## Tier 3 – Phased Out / Consolidated (Governance Actions)

These legacy collections are frozen and phased out. Code must be migrated to Tier 1 / Tier 2 fields:

| Legacy Collection | Status | Consolidation Target |
| :--- | :--- | :--- |
| `requirements_public` | ❌ Removed | Replaced by `requirements.visibility.public = true` |
| `requirements_private` | ❌ Removed | Replaced by `requirements.visibility.vendors = true` |
| `jobs` | ❌ Removed | Fully unified with `requirements` |
| `validation_results` | ❌ Consolidated | Relocated to `system_runtime` metadata |
| `intake_metrics` | ❌ Consolidated | Relocated to `system_runtime` metrics |
| `intake_events` | ❌ Consolidated | Relocated to `system_events` |
| `intake_audit` | ❌ Consolidated | Relocated to `system_events` |
| `ingestion_telemetry` | ❌ Consolidated | Relocated to `system_runtime` telemetry |
| `error_monitoring_logs` | ❌ Consolidated | Relocated to `system_logs` |
| `event_subscriptions` | ❌ Consolidated | Relocated to `system_event_subscriptions` |
| `workflowEvents` | ❌ Consolidated | Relocated to `system_events` |
| `execution_events` | ❌ Consolidated | Relocated to `system_events` |
| `ownership_audit_log` | ❌ Consolidated | Relocated to `system_events` |
| `oauth_debug` | ❌ Deleted | Purged (Development-only trace) |
| `jd_cache` | ❌ Deleted | Replaced with AI Gateway response cache (`ai_gateway_cache`) |

---

## Data Drift and Deduplication Policies
1.  **Strict Anti-Drift Rule**: The field `candidate.pipelineStage` must NEVER exist. All status progression must be queried directly from `submissions.status` for the specific requirement.
2.  **Resume Deduplication**: Before a record is written to `candidates`, a SHA-256 hash of the sanitized file text is generated. If a document already exists with that hash in the active workspace, the system rejects the creation and raises a duplicate warning block to prevent clutter.
