# State Store Specification

This document defines the application state stores mapping to our Service Layer for HireNestOS.

## CandidateStore

**Owner:** Candidate Module  
**Depends On:** `ICandidateService`

**State:**
- `candidate: Candidate | null`
- `candidateLoading: boolean`
- `candidateError: string | null`

**Consumers:**
- `Candidate360`
- `CandidateReview`

## SubmissionStore

**Owner:** Submission Module  
**Depends On:** `ISubmissionService`

**State:**
- `submissions: Submission[]`
- `selectedSubmission: Submission | null`
- `interviewState: Record<string, any>`
- `offerState: Record<string, any>`
- `isLoading: boolean`
- `error: string | null`

**Consumers:**
- `Candidate360`
- `InterviewScheduler`
- `VendorWorkspace`

## RequirementStore

**Owner:** Requirement Module  
**Depends On:** `IRequirementService`

**State:**
- `requirements: Requirement[]`
- `selectedRequirement: Requirement | null`
- `isLoading: boolean`
- `error: string | null`

**Consumers:**
- `RequirementLedgerModal`
- `ExecutionFeed`

## IdentityStore

**Owner:** Identity Module  
**Depends On:** `IClientService`, `IVendorService`, `IRecruiterService`

**State:**
- `clients: Client[]`
- `vendors: Vendor[]`
- `recruiters: Recruiter[]`
- `isLoading: boolean`
- `error: string | null`

**Consumers:**
- System-wide App state
- `ExecutionFeed`
