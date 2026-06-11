# Execution Blueprint: Phase 1 Refactor

## 1. Architecture Diagram

```mermaid
graph TD
    UI[UI Components] --> Store[State Store]
    Store --> Provider[ServiceProvider]
    
    subgraph Service Layer [Service Layer (Contracts)]
        Provider --> ICan[ICandidateService]
        Provider --> IReq[IRequirementService]
        Provider --> ISub[ISubmissionService]
        Provider --> ICli[IClientService]
        Provider --> IVen[IVendorService]
        Provider --> IRec[IRecruiterService]
    end
    
    subgraph Infrastructure [Firebase Implementations]
        ICan --> FCan[FirebaseCandidateService]
        IReq --> FReq[FirebaseRequirementService]
        ISub --> FSub[FirebaseSubmissionService]
        ICli --> FCli[FirebaseClientService]
        IVen --> FVen[FirebaseVendorService]
        IRec --> FRec[FirebaseRecruiterService]
    end
    
    FCan --> Firestore[(Firestore)]
    FReq --> Firestore
    FSub --> Firestore
    FCli --> Firestore
    FVen --> Firestore
    FRec --> Firestore
```

## 2. Target File Tree (Service Layer)

```text
src/
└── lib/
    ├── services/
    │   ├── contracts/
    │   │   ├── ICandidateService.ts
    │   │   ├── IRequirementService.ts
    │   │   ├── ISubmissionService.ts
    │   │   ├── IClientService.ts
    │   │   ├── IVendorService.ts
    │   │   └── IRecruiterService.ts
    │   ├── firebase/
    │   │   ├── FirebaseCandidateService.ts
    │   │   ├── FirebaseRequirementService.ts
    │   │   ├── FirebaseSubmissionService.ts
    │   │   ├── FirebaseClientService.ts
    │   │   ├── FirebaseVendorService.ts
    │   │   └── FirebaseRecruiterService.ts
    │   └── ServiceProvider.ts
```

## 3. Dependency Map

- **UI Components** may ONLY import from `src/lib/services/ServiceProvider.ts` (or mapped State Stores). They are strictly forbidden from importing from `src/lib/services/firebase/*` or accessing the `firebase/firestore` SDK directly.
- **ServiceProvider** instantiates and exports the specific infrastructure implementations mapping to the contracts (e.g., injecting `FirebaseCandidateService` as the active `ICandidateService`).
- **Firebase Implementations** (`Firebase*.ts`) are the ONLY files permitted to import `firebase/firestore`, `firebase/auth`, or the `db` initialization.
- **Contracts** (`I*.ts`) contain pure TypeScript interface definitions and domain payload mappings. They do not depend on Firebase or any specific database SDK.

## 4. Migration Order & Deployment Strategy

To mitigate operational risk, the refactor and rollout are segmented into two distinct deployment phases.

### Deployment A (Low-Risk / Read-Mostly Components)
This phase validates the runtime performance of the Service Layer, the integrity of the ServiceProvider abstraction, and build pipelines without risking core revenue-generating workflows.

**Components to Migrate:**
1. `RequirementLedgerModal.tsx`
2. `ExecutionFeed.tsx`
3. `LiveToaster.tsx`
4. `StressTestRunner.tsx`
5. Top-level read-only aggregations in `App.tsx` (if applicable)

**Acceptance Criteria for Deployment A:**
- Zero direct `firebase/firestore` imports remain in the target files.
- Read operations execute successfully through the `ServiceProvider`.
- CI/CD builds successfully.

### Deployment B (High-Risk / Core Workflows)
Once Deployment A is verified, we migrate the critical mutate-heavy workflows dealing with Candidates and Submissions.

**Components to Migrate:**
1. `Candidate360Modal.tsx`
2. `CandidateSubmissionModal.tsx`
3. `CandidateReviewModal.tsx`
4. `InterviewSchedulerModal.tsx`
5. `RequirementDiscussionThread.tsx`

**Acceptance Criteria for Deployment B:**
- Eradicate direct `firebase/firestore` from `src/components/*`.
- Remove fragmented multi-collection updates from within React's `onClick` handlers.
- UI layer transitions to triggering domain-safe application events via the `ServiceProvider` (e.g., dispatching `createSubmissionFlow()`).
