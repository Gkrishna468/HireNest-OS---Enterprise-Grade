# HireNest Workforce — Core Platform Architecture Blueprint
**Document ID:** `HN-ARCH-028`  
**Status:** Canonical Master Architecture  
**Authoritative Rule:** Single Core Platform, Two Product Surfaces (`os.hirenestworkforce.com` & `crm.hirenestworkforce.com`), One Firestore SSOT.

---

## 1. Architectural Vision & High-Level Topology

HireNest Workforce is architected as **One Unified Core Platform** powering two specialized product surfaces:
- **`os.hirenestworkforce.com` (HireNest OS):** The Operational Command Center for demand fulfillment, candidate matching, vendor coordination, SLA monitoring, and platform governance.
- **`crm.hirenestworkforce.com` (HireNest CRM):** The Commercial Front Door for client acquisition, lead qualification, account intelligence, proposals, and revenue pipeline.

```text
                         HIRENEST WORKFORCE
                                │
                       CORE PLATFORM / CORE
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
       Identity              Business             Intelligence
       + RBAC                Services               + AI
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                         Firestore SSOT
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
       os.hirenestworkforce.com       crm.hirenestworkforce.com
                 │                             │
          HIRENEST OS                       HIRENEST CRM
          (Operations)                       (Revenue)
```

---

## 2. Product Surfaces & Domain Boundaries

```text
                    HIRENEST WORKFORCE
                           │
                     ┌─────┴─────┐
                     │   CORE    │
                     │ PLATFORM  │
                     └─────┬─────┘
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
    IDENTITY             DATA                 AI
    RBAC                 SSOT             INTELLIGENCE
    ABAC                 AUDIT             MATCHING
    SESSIONS             EVENTS            SCORING
       │                   │                NEXT ACTION
       └───────────────────┼────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
   os.hirenestworkforce.com    crm.hirenestworkforce.com
             │                           │
       OPERATIONS                    REVENUE
             │                           │
       Recruitment OS                 CRM
       Vendor OS                      AI SDR
       Candidate 360                  Accounts
       Requirements                   Contacts
       Matching                       Opportunities
       Submissions                    Outreach
       SLA                            Pipeline
       Placements                     Revenue
             │                           │
             └─────────────┬─────────────┘
                           ▼
                    SAME HIRENEST SSOT
```

### 2.1. `os.hirenestworkforce.com` — Operational Command Center
Surfaces and controls operational execution:
* **Mission Control & Command Center:** Operational queues, system health, and recruiter workloads.
* **Requirements Engine:** Active requisitions, SLA timers, bill rates, and vendor tier authorizations.
* **Clients & Client OS:** Client account setups, hiring managers, and active demand telemetry.
* **Vendors & Vendor OS:** Agency registries, vendor tiers, recruiter seat allocation, and trust scores.
* **Candidate 360:** Global deduplicated candidate pool, skills graph, parsing, and ownership ledger.
* **AI Match Intelligence:** Layer 1 deterministic filters, Layer 2 semantic matching, and Layer 3 recruiter overrides.
* **Submissions & Ownership Vault:** Stage progression, duplicate checks, and vendor representation ownership.
* **Interviews, Offers & Placements:** Interview lifecycle, offer audit, joining verification, and SLA tracking.
* **User Administration & RBAC:** Authoritative 7-role lifecycle, organization mapping, and safe deactivations.

### 2.2. `crm.hirenestworkforce.com` — Commercial Front Door
Surfaces and drives client business development and revenue:
* **Accounts & Companies:** Enterprise client organizations, tech stack profiles, and hiring signals.
* **Contacts & Decision Makers:** Talent Acquisition heads, VP Engineering, and HR Directors.
* **Leads & Opportunities:** Deal stages, commercial terms, rate cards, and qualification pipelines.
* **AI SDR & Outreach:** Automated hiring intent detection, personalized engagement, and follow-up cadence.
* **Proposals & Commercials:** MSAs, rate cards, fee structures, and contract terms.
* **Live Requirement Handoff & Delivery Status:** Real-time visibility into hiring progress without exposing internal operational logs.

---

## 3. Shared Core Platform Services

The Core platform is the authoritative engine; OS and CRM are presentation clients consuming Core:

```text
CORE
│
├── Identity
│   ├── Authentication (Firebase Auth)
│   ├── Provisioning (/api/create-user)
│   ├── Sessions & Token Refresh
│   └── Safe Deactivation (/api/deactivate-user)
│
├── RBAC & ABAC
│   ├── Authoritative 7-Role Catalog
│   ├── Single Source of Truth Permissions
│   ├── ABAC Policy Enforcement
│   └── Organization / Vendor Hierarchy Scoping
│
├── Business Entities (SSOT)
│   ├── Requirements (`requirements`)
│   ├── Clients (`clients`, `organizations`)
│   ├── Vendors (`vendors`, `organizations`)
│   ├── Recruiters (`users`)
│   ├── Candidates & Candidate 360 (`candidatePool`)
│   ├── Submissions (`submissions`)
│   ├── Interviews & Offers (`interviews`, `offers`)
│   └── Placements (`placements`)
│
├── HireNest AI Core
│   ├── Candidate Intelligence & Resume Parsing
│   ├── Requirement Intelligence & JD Calibration
│   ├── Account Intelligence & Hiring Intent
│   ├── AI SDR & Next Best Action Engine
│   ├── Multi-Tier Scoring Models
│   └── Continuous Feedback & Learning
│
├── Workflow & Events
│   ├── SLA Timers & Breach Escalation
│   ├── Universal Event Bus (`system_events`)
│   └── Notifications & Alerts
│
├── Audit Ledger
│   └── Immutable Audit Trail (`audit_logs`)
│
└── Analytics Engine
    ├── Operational Metrics & Delivery Velocity
    └── Commercial Performance & Pipeline Yield
```

---

## 4. Single Identity & Authoritative Access Resolution

Both `os.hirenestworkforce.com` and `crm.hirenestworkforce.com` resolve identity from the **same single record**:

```text
Firebase Auth
      ↓
uid
      ↓
Firestore users/{uid}
      ↓
role (PLATFORM_AUTHORITY | BUSINESS_OPERATIONS | CLIENT_ADMIN | CLIENT_HM | CLIENT_FINANCE | VENDOR_ADMIN | VENDOR_RECRUITER)
      ↓
organizationId (Mapped Tenant)
      ↓
vendorId / clientId (Hierarchy Anchor)
      ↓
permissions (Authoritative Capability Matrix)
```

### Access Resolution Rules:
* **Business Operations / Platform Authority:** Global access across both OS and CRM interfaces, with full administrative and governance authority.
* **Client Admin / Hiring Manager / Finance:** Scoped client access in OS (reviewing their requisitions and interviews) and client view in CRM.
* **Vendor Admin / Recruiter:** Scoped exclusively to Vendor OS under their parent `vendorId`; CRM commercial surfaces are restricted.
* **Deactivated Identities (`status: INACTIVE`):** Instantly revoked in Firebase Auth and blocked across both OS and CRM, while preserving all historical candidate submissions, interviews, and ledger records.

---

## 5. Centralized User Administration

* **Zero Duplication:** User administration exists solely in Core and is surfaced through the OS Administrative interface (`/admin/users`).
* **CRM Consumes Core Identity:** CRM never maintains a separate user database. It queries Core identity and authorization contracts.
* **No Privilege Drift:** Eliminates inconsistencies where a user is assigned different permission tiers in separate databases.

---

## 6. Vendor & Recruiter Hierarchy in Core

Core establishes the formal vendor organization tree:
```text
Vendor Organization (e.g. ORG-V-APEX)
   │
   ├── Vendor Admin (Manages agency recruiter seats, views agency analytics)
   │
   ├── Vendor Recruiter A (Submits candidates under ORG-V-APEX)
   ├── Vendor Recruiter B (Submits candidates under ORG-V-APEX)
   └── Vendor Recruiter C (Submits candidates under ORG-V-APEX)
```
* **No Free-Floating Recruiters:** Every `VENDOR_RECRUITER` has `vendorId` and `managedByVendorId` anchored to the parent Vendor entity.
* Both OS and CRM consume this exact hierarchy without re-implementing organization models.

---

## 7. Bi-Directional CRM ↔ OS Requirement & Delivery Handoff

```text
      CRM (Commercial)                                          OS (Operations)
  ┌───────────────────────┐                                 ┌───────────────────────┐
  │ Salesperson qualifies │                                 │ Operations receives   │
  │ Opportunity (ABC Tech,│                                 │ New Requirement       │
  │ Java, 10 positions)   │                                 │ (Status: ACTIVE,      │
  │                       │                                 │ Dist: UNPUBLISHED)    │
  │ [ Create Requirement ]│                                 │                       │
  └──────────┬────────────┘                                 └───────────▲───────────┘
             │                                                          │
             │ (1) Handoff Event                                        │ (2) Ingest & Calibrate
             ▼                                                          │
   ┌────────────────────────────────────────────────────────────────────┴───────────┐
   │                                HIRENEST CORE                                   │
   │ - Generates Requisition ID: HN-REQ-10482                                       │
   │ - Links Account & Opportunity mappings                                         │
   │ - Emits `REQUIREMENT_CREATED` event                                            │
   └──────────────────────────────────┬─────────────────────────────────────────────┘
                                      │
                                      │ (3) Operational Execution (Submissions, Interviews, Offers)
                                      ▼
   ┌────────────────────────────────────────────────────────────────────────────────┐
   │                                HIRENEST CORE                                   │
   │ - Aggregates fulfillment progress (10 req, 6 subs, 3 interviews, 1 joined)     │
   │ - Calculates real-time pipeline yield & revenue realization                    │
   └──────────────────────────────────┬─────────────────────────────────────────────┘
             │                                                          │
             ▼                                                          │
  ┌───────────────────────┐                                             │
  │ CRM displays live     │                                             │
  │ Delivery Status:      │                                             │
  │ - Hiring Progress: 60%│◄────────────────────────────────────────────┘
  │ - Pipeline Val: ₹25L  │ (4) Real-Time Feedback Loop
  │ - Placed: 1 / 10      │
  └───────────────────────┘
```

1. **CRM → OS Handoff:** Sales qualifies a deal $\rightarrow$ Core creates the requisition (`HN-REQ-xxxxx`) $\rightarrow$ OS Operations validates, calibrates AI requirements, assigns recruiters, authorizes vendor tiers, and begins candidate matching.
2. **OS → CRM Feedback:** As candidates progress through submissions, technical interviews, offers, and joining, Core automatically updates the requirement fulfillment status, giving sales real-time delivery telemetry without exposing sensitive recruiter notes.

---

## 8. Unified HireNest AI Core & Human-in-the-Loop Governance

All AI capabilities are centralized in Core to ensure consistent intelligence and zero logic duplication:

```text
                 HIRENEST AI CORE
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   CRM Requests   OS Requests      API / Worker
   (Intent/SDR)   (Match/Parsing)  (Scoring/SLA)
       │               │                │
       └───────────────┼────────────────┘
                       │
             SAME INTELLIGENCE ENGINE
  (Deterministic L1 + Semantic L2 + Human Override L3)
```

### AI Operating Principle: Augmented Intelligence, Not Autonomous Action
AI operates strictly within a **Human-in-the-Loop (HITL)** paradigm:
```text
AI
 │
 ├── Analyze
 ├── Score
 ├── Recommend
 ├── Draft
 └── Predict
       │
       ▼
Human / Authorized Workflow (Approval Gate)
       │
       ▼
Execute (Core Service)
```
- **Prohibited Autonomous Actions:** AI models and agents **MUST NEVER** autonomously create submissions, dispatch client emails, modify requirements, or mutate user permissions without explicit human authorization.
- **Universal Authorization:** RBAC/ABAC applies equally to humans and AI. An AI tool invocation executes strictly under the caller's authorized role and organization scope.
- **Account Intelligence & Intent:** Evaluates company tech stack growth, funding news, and hiring velocity.
- **AI SDR & Next Best Action:** Formulates high-probability outbound outreach drafts for human approval.
- **Candidate 360 & Matching:** Evaluates resume context, verified skills, and job compatibility (Layer 1 Deterministic + Layer 2 Semantic + Layer 3 Recruiter Override).
- **SLA Risk Forecasting:** Predicts requisition fulfillment bottlenecks before SLA deadlines breach.

---

## 9. Firestore Single Source of Truth (SSOT) & Integrations Policy

### Authoritative SSOT Rule
> **"Firestore/HireNest Core is the sole operational SSOT. External systems such as Google Sheets are integrations/mirrors only and can never override Core authorization or operational state."**

- **Authoritative Flow:** Core mutates state in Firestore $\rightarrow$ Outbound webhooks or synchronization workers update Google Sheets or external analytics as mirrors.
- **Inbound Data via Integrations:** Inbound data from external integrations (e.g., CSV imports, Google Sheets intake) passes through Core validation and RBAC checks before committing to Firestore.

| Collection Domain | Authoritative Schema | Primary Consumers |
| :--- | :--- | :--- |
| **Identity & Access** | `users`, `organizations`, `audit_logs` | Core, OS, CRM |
| **Operations Engine** | `requirements`, `candidatePool`, `submissions`, `interviews`, `offers`, `placements` | Core, OS |
| **Commercial Engine** | `crm_accounts`, `crm_contacts`, `crm_leads`, `crm_opportunities`, `crm_proposals` | Core, CRM |
| **AI & Telemetry** | `system_events`, `ai_telemetry`, `candidate_matches`, `requirement_match_index` | Core, OS, CRM |

---

## 10. Implementation Roadmap (Architecture → Implementation → Verification)

Implementation follows a strict 5-phase sequential order:

1. **Phase 1 — Core Foundation:**
   - Authoritative 7-role catalog (`src/lib/rbac.ts`), RBAC/ABAC verification (`src/lib/permissions.ts`), user provisioning (`/api/create-user`), non-destructive deactivation (`/api/deactivate-user`), immutable audit ledger (`audit_logs`), and vendor-recruiter hierarchy.
2. **Phase 2 — Shared Business Core Services (`src/core/services/`):**
   - Standardize `ClientService`, `RequirementService`, `VendorService`, `RecruiterService`, `CandidateService`, `Candidate360Service`, `SubmissionService`, `InterviewService`, `OfferService`, `PlacementService`, `SLAService`, `BudgetService`, and `PerformanceService`.
3. **Phase 3 — Intelligence Core (`src/core/intelligence/`):**
   - Centralize Account Intelligence, Hiring Signals, Requirement Intelligence, Layer 1/2/3 Candidate Matching, Scoring Models, and Next Best Action drafts.
4. **Phase 4 — OS Product Surface (`os.hirenestworkforce.com`):**
   - Operational workspace interfaces consuming Core business and intelligence services with strict role scoping.
5. **Phase 5 — CRM Product Surface (`crm.hirenestworkforce.com`):**
   - Commercial workspace interfaces consuming Core services, CRM $\rightarrow$ OS Requisition handoff, and OS $\rightarrow$ CRM live delivery feedback loops.

---

## 11. Unified Global Navigation & Workspace Switcher

The top-level shell adapts dynamically to the authenticated identity:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  HIRENEST WORKFORCE        [ CRM ]       [ RECRUITMENT OS ]       [ AI COMMAND ]   (👤)│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Role | CRM Workspace | Operations OS | AI Command Center | User Admin & RBAC |
| :--- | :---: | :---: | :---: | :---: |
| **Platform Authority (HQ)** | Yes | Yes | Yes | Yes |
| **Business Operations (HQ)** | Yes | Yes | Yes | Yes |
| **Client Admin** | Yes (Client View) | Yes (Requisitions) | Scoped | Self Org |
| **Client Hiring Manager** | — | Yes (Interviews) | — | — |
| **Vendor Admin** | — | Yes (Vendor OS) | Scoped | Agency Seats |
| **Vendor Recruiter** | — | Yes (My Submissions) | Scoped | — |

---

## 11. The Golden Architectural Mandate

> **"OS and CRM are presentation/workspace layers. Core owns identity, authorization, business entities, intelligence, workflows, and audit."**

This rule guarantees that HireNest Workforce operates as a unified, enterprise-grade staffing operating system with zero data duplication, strict RBAC governance, and seamless commercial-to-operational velocity.
