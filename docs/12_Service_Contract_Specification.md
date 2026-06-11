# Service Contract Specification

This document defines the strict Service Layer contracts for HireNestOS.

## ICandidateService

Provides access to Candidate Data.

### `getCandidate(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<Candidate | null>`
- **Ownership:** Candidate Module
- **Source of Truth:** `candidates` collection
- **Side Effects:** None
- **Events Emitted:** None
- **Release Gate:** P0

### `createCandidate(data: CandidateInput)`
- **Inputs:** `data: CandidateInput`
- **Outputs:** `Promise<Candidate>`
- **Ownership:** Candidate Module
- **Source of Truth:** `candidates` collection
- **Side Effects:** Writes a new record to the datastore
- **Events Emitted:** `CANDIDATE_CREATED`
- **Release Gate:** P0

### `updateCandidate(id: string, updates: CandidateUpdate)`
- **Inputs:** `id: string`, `updates: CandidateUpdate`
- **Outputs:** `Promise<void>`
- **Ownership:** Candidate Module
- **Source of Truth:** `candidates` collection
- **Side Effects:** Updates an existing candidate record
- **Events Emitted:** `CANDIDATE_UPDATED`
- **Release Gate:** P0

### `archiveCandidate(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Candidate Module
- **Source of Truth:** `candidates` collection
- **Side Effects:** Marks candidate as archived or deletes it softly
- **Events Emitted:** `CANDIDATE_ARCHIVED`
- **Release Gate:** P0


## ISubmissionService

Provides access to Submission states and relationships mapping Candidates, Requirements, Clients, and Vendors.

### `getSubmission(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<Submission | null>`
- **Ownership:** Submission Module
- **Source of Truth:** `submissions` collection
- **Side Effects:** None
- **Events Emitted:** None
- **Release Gate:** P0

### `createSubmission(data: SubmissionInput)`
- **Inputs:** `data: SubmissionInput`
- **Outputs:** `Promise<Submission>`
- **Ownership:** Submission Module
- **Source of Truth:** `submissions` collection
- **Side Effects:** Writes a new submission linking requirement and candidate
- **Events Emitted:** `SUBMISSION_CREATED`
- **Release Gate:** P0

### `updateStatus(id: string, status: string)`
- **Inputs:** `id: string`, `status: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Submission Module
- **Source of Truth:** `submissions` collection
- **Side Effects:** Mutates `status` field
- **Events Emitted:** `SUBMISSION_STATUS_UPDATED`
- **Release Gate:** P0

### `updateInterviewEvent(id: string, event: Record<string, any>)`
- **Inputs:** `id: string`, `event: Record<string, any>`
- **Outputs:** `Promise<void>`
- **Ownership:** Submission Module
- **Source of Truth:** `submissions` collection
- **Side Effects:** Updates `interviewStatus`, `interviewFeedback`, and increment `interviewRounds`
- **Events Emitted:** `INTERVIEW_SCHEDULED` / `INTERVIEW_FEEDBACK_ADDED`
- **Release Gate:** P0

### `updateOfferStatus(id: string, offerStatus: string)`
- **Inputs:** `id: string`, `offerStatus: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Submission Module
- **Source of Truth:** `submissions` collection
- **Side Effects:** Modifies offer state for candidate
- **Events Emitted:** `OFFER_STATUS_UPDATED`
- **Release Gate:** P0

### `updateJoiningStatus(id: string, joiningStatus: string)`
- **Inputs:** `id: string`, `joiningStatus: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Submission Module
- **Source of Truth:** `submissions` collection
- **Side Effects:** Final state modification on submission
- **Events Emitted:** `JOINING_STATUS_UPDATED`
- **Release Gate:** P0


## IRequirementService

Provides access to Requirement objects.

### `getRequirement(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<Requirement | null>`
- **Ownership:** Requirement Module
- **Source of Truth:** `requirements` collection
- **Side Effects:** None
- **Events Emitted:** None
- **Release Gate:** P0

### `createRequirement(data: RequirementInput)`
- **Inputs:** `data: RequirementInput`
- **Outputs:** `Promise<Requirement>`
- **Ownership:** Requirement Module
- **Source of Truth:** `requirements` collection
- **Side Effects:** Database record created
- **Events Emitted:** `REQUIREMENT_CREATED`
- **Release Gate:** P0

### `updateRequirement(id: string, updates: RequirementUpdate)`
- **Inputs:** `id: string`, `updates: RequirementUpdate`
- **Outputs:** `Promise<void>`
- **Ownership:** Requirement Module
- **Source of Truth:** `requirements` collection
- **Side Effects:** Requirement fields modified (e.g. Budget, Priority, Status)
- **Events Emitted:** `REQUIREMENT_UPDATED`
- **Release Gate:** P0

### `archiveRequirement(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Requirement Module
- **Source of Truth:** `requirements` collection
- **Side Effects:** Closes requirement securely
- **Events Emitted:** `REQUIREMENT_ARCHIVED`
- **Release Gate:** P0


## IClientService

Provides access to Client organizations.

### `getClient(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<Client | null>`
- **Ownership:** Identity Module
- **Source of Truth:** `clients` collection
- **Side Effects:** None
- **Events Emitted:** None
- **Release Gate:** P0

### `createClient(data: ClientInput)`
- **Inputs:** `data: ClientInput`
- **Outputs:** `Promise<Client>`
- **Ownership:** Identity Module
- **Source of Truth:** `clients` collection
- **Side Effects:** Client created
- **Events Emitted:** `CLIENT_CREATED`
- **Release Gate:** P0

### `updateClient(id: string, updates: ClientUpdate)`
- **Inputs:** `id: string`, `updates: ClientUpdate`
- **Outputs:** `Promise<void>`
- **Ownership:** Identity Module
- **Source of Truth:** `clients` collection
- **Side Effects:** Updates details
- **Events Emitted:** `CLIENT_UPDATED`
- **Release Gate:** P0

### `archiveClient(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Identity Module
- **Source of Truth:** `clients` collection
- **Side Effects:** Soft deletions
- **Events Emitted:** `CLIENT_ARCHIVED`
- **Release Gate:** P0


## IVendorService

Provides access to Vendor agency profiles.

### `getVendor(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<Vendor | null>`
- **Ownership:** Identity Module
- **Source of Truth:** `vendors` collection
- **Side Effects:** None
- **Events Emitted:** None
- **Release Gate:** P0

### `createVendor(data: VendorInput)`
- **Inputs:** `data: VendorInput`
- **Outputs:** `Promise<Vendor>`
- **Ownership:** Identity Module
- **Source of Truth:** `vendors` collection
- **Side Effects:** Record generation
- **Events Emitted:** `VENDOR_CREATED`
- **Release Gate:** P0

### `updateVendor(id: string, updates: VendorUpdate)`
- **Inputs:** `id: string`, `updates: VendorUpdate`
- **Outputs:** `Promise<void>`
- **Ownership:** Identity Module
- **Source of Truth:** `vendors` collection
- **Side Effects:** Adjust vendor metrics/configuration
- **Events Emitted:** `VENDOR_UPDATED`
- **Release Gate:** P0

### `archiveVendor(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Identity Module
- **Source of Truth:** `vendors` collection
- **Side Effects:** Record disabled
- **Events Emitted:** `VENDOR_ARCHIVED`
- **Release Gate:** P0


## IRecruiterService

Provides access to Recruiter identities.

### `getRecruiter(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<Recruiter | null>`
- **Ownership:** Identity Module
- **Source of Truth:** `recruiters` collection
- **Side Effects:** None
- **Events Emitted:** None
- **Release Gate:** P0

### `createRecruiter(data: RecruiterInput)`
- **Inputs:** `data: RecruiterInput`
- **Outputs:** `Promise<Recruiter>`
- **Ownership:** Identity Module
- **Source of Truth:** `recruiters` collection
- **Side Effects:** Account provisioning info recorded
- **Events Emitted:** `RECRUITER_CREATED`
- **Release Gate:** P0

### `updateRecruiter(id: string, updates: RecruiterUpdate)`
- **Inputs:** `id: string`, `updates: RecruiterUpdate`
- **Outputs:** `Promise<void>`
- **Ownership:** Identity Module
- **Source of Truth:** `recruiters` collection
- **Side Effects:** Information changes
- **Events Emitted:** `RECRUITER_UPDATED`
- **Release Gate:** P0

### `archiveRecruiter(id: string)`
- **Inputs:** `id: string`
- **Outputs:** `Promise<void>`
- **Ownership:** Identity Module
- **Source of Truth:** `recruiters` collection
- **Side Effects:** Revoke access/disable profiles
- **Events Emitted:** `RECRUITER_ARCHIVED`
- **Release Gate:** P0
