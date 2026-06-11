# Architecture Registry

This document defines the canonical architecture registry and ownership per domain to prevent uncoordinated database reads/writes and architectural fragmentation.

## Candidates
- **Collection Name:** `candidates`
- **Primary Owner:** Candidate Module
- **Source of Truth:** Firestore
- **Service Layer:** `CandidateService`
- **State Store:** `CandidateStore`
- **Consumers:** Candidate360, RequirementWorkspace, Analytics
- **Release Gate:** P0

## Requirements
- **Collection Name:** `requirements`
- **Primary Owner:** Requirement Module
- **Source of Truth:** Firestore
- **Service Layer:** `RequirementService`
- **State Store:** `RequirementStore`
- **Consumers:** ClientWorkspace, VendorWorkspace, MatchingEngine, Analytics
- **Release Gate:** P0

## Submissions
- **Collection Name:** `submissions`
- **Primary Owner:** Submission Module
- **Source of Truth:** Firestore
- **Service Layer:** `SubmissionService`
- **State Store:** `SubmissionStore`
- **Consumers:** Candidate360, ClientWorkspace, VendorWorkspace, InterviewProcessing, Analytics
- **Release Gate:** P0

## Clients
- **Collection Name:** `clients`
- **Primary Owner:** Identity Module
- **Source of Truth:** Firestore
- **Service Layer:** `ClientService`
- **State Store:** `ClientStore`
- **Consumers:** ClientWorkspace, Reporting
- **Release Gate:** P0

## Vendors
- **Collection Name:** `vendors`
- **Primary Owner:** Identity Module
- **Source of Truth:** Firestore
- **Service Layer:** `VendorService`
- **State Store:** `VendorStore`
- **Consumers:** VendorWorkspace, Submissions Processing, Analytics
- **Release Gate:** P0

## Recruiters
- **Collection Name:** `recruiters`
- **Primary Owner:** Identity Module
- **Source of Truth:** Firestore
- **Service Layer:** `RecruiterService`
- **State Store:** `RecruiterStore`
- **Consumers:** Identity & Access, VendorWorkspace, Submissions Processing
- **Release Gate:** P0
