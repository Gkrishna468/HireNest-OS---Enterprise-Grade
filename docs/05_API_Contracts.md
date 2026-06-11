# API Contracts

## Core Principle
- **No component may access Firestore directly.**
- All data flows through these defined service layers.
- This prevents isolated and unstructured Firestore interactions from UI components.

## CandidateService
- `createCandidate()`
- `updateCandidate()`
- `getCandidate()`
- `archiveCandidate()`

## RequirementService
- `createRequirement()`
- `updateRequirement()`
- `getRequirement()`

## SubmissionService
- `createSubmission()`
- `updateStatus()`
- `getSubmission()`
