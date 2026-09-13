# Technical Architecture Document

## Master Architecture Blueprint
The canonical architectural specification for HireNest Workforce is documented in:
👉 **[`/docs/28_HIRENEST_WORKFORCE_CORE_PLATFORM_ARCHITECTURE.md`](./28_HIRENEST_WORKFORCE_CORE_PLATFORM_ARCHITECTURE.md)**

### Core Architectural Principles
1. **Separation of Concerns**:
   > **"OS and CRM are presentation/workspace layers. Core owns identity, authorization, business entities, intelligence, workflows, and audit."**
2. **Authoritative SSOT vs. Mirrors**:
   > **"Firestore/HireNest Core is the sole operational SSOT. External systems such as Google Sheets are integrations/mirrors only and can never override Core authorization or operational state."**
3. **AI Governance & Human-in-the-Loop**:
   > **"Core AI is structured strictly as Analyze, Score, Recommend, Draft, and Predict. Autonomous execution is prohibited; business actions require human review or authorized deterministic workflow. RBAC/ABAC applies equally to humans and AI."**

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

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend/Database**: Firebase (Firestore, Firebase Auth)
- **API & Core Handlers**: Node.js / Express backend layer with authoritative RBAC validation.
- **AI & Match Intelligence**: Centralized HireNest AI Core powered by Google GenAI (Deterministic L1 + Semantic L2 + Human Override L3).

## Database Schema (Firestore SSOT)
- **`users` / `organizations`**: Single Source of Truth for Identity, RBAC, and Vendor Hierarchy.
- **`candidatePool`**: Global registry of deduplicated candidate profiles.
- **`requirements` / `jobs`**: Shared Requisitions & Requirements ledger.
- **`submissions`**: Linkage between candidate, vendor, and requirement with immutable stage progression.
- **`interviews` / `offers` / `placements`**: Downstream delivery and fulfillment pipeline.
- **`crm_accounts` / `crm_contacts` / `crm_opportunities`**: Commercial revenue pipeline and AI SDR targets.
- **`system_events` / `audit_logs`**: Universal event bus and immutable audit ledger.

