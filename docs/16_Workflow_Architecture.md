# Phase 3: Workflow Architecture Governance

## Core Philosophy
Workflows act as the orchestration layer for the HireNestOS Event-Driven Architecture.
They represent multi-step business processes that span across multiple services and states.

**CRITICAL RULES:**
1. **Workflow = Orchestration Only.** Workflows coordinate Services. Workflows contain NO direct database interactions, external HTTP calls, or business logic isolated within a Service.
2. **One-Way Dependency.** Workflows may call Services. Services may NEVER call Workflows. UI may NEVER call Workflows. UI calls Services, or UI emits Events which trigger Workflows.
3. **Idempotency.** Workflows must be designed to be retried safely.

## Workflow Registration & Execution
All workflows run via the `WorkflowRegistry`. The system listens to the Event Bus (or direct Service orchestrations temporarily before Phase 4) and dispatches execution Context to the relevant Workflow.

## Core Workflows

### 1. SubmissionWorkflow
- **Inputs Trigger:** `SUBMISSION_CREATED`
- **Responsibilities:** Candidate validation, routing logic, vendor notification, AI scoring triggers.
- **Invokes:** `ISubmissionService`, `ICandidateService`, `IVendorService`, `IEventService`
- **Output Events:** `CANDIDATE_MATCHED`, `VENDOR_NOTIFIED`
- **Retry Policy:** 3 attempts
- **Human Approval:** Not required

### 2. InterviewWorkflow
- **Inputs Trigger:** `INTERVIEW_SCHEDULED`, `INTERVIEW_FEEDBACK_ADDED`
- **Responsibilities:** Orchestrating interview requests, calendar syncing operations (via services), feedback capture states.
- **Invokes:** `ISubmissionService`, `IClientService`, `IEventService`
- **Output Events:** `INTERVIEW_UPDATED`, `SUBMISSION_UPDATED`
- **Retry Policy:** 3 attempts
- **Human Approval:** Required for overriding reject decisions.

### 3. OfferWorkflow
- **Inputs Trigger:** `OFFER_RELEASED`, `OFFER_ACCEPTED`, `CANDIDATE_JOINED`
- **Responsibilities:** Managing candidate signing statuses, joining timeline SLA tracking, onboarding document prep calls.
- **Invokes:** `ISubmissionService`, `IClientService`, `ICandidateService`, `IEventService`
- **Output Events:** `OFFER_STATUS_UPDATED`, `JOINING_STATUS_UPDATED`, `PLACEMENT_COMPLETED`
- **Retry Policy:** 3 attempts
- **Human Approval:** Required for offer generation.

### 4. VendorWorkflow
- **Inputs Trigger:** `JOB_PUBLISHED`, `VENDOR_ASSIGNED`
- **Responsibilities:** Vendor mandate drops, SLA tracking initialization, performance scoring initialization.
- **Invokes:** `IVendorService`, `IRequirementService`, `IEventService`
- **Output Events:** `VENDOR_NOTIFIED`, `JOB_CLOSED`
- **Retry Policy:** 3 attempts
- **Human Approval:** Not required.

## Future Context: Temporal Integration
These synchronous/asynchronous code-based Workflows will eventually migrate into Temporal Workers in Phase 5. Abstract definitions (`WorkflowStatus`, `WorkflowResult`, `WorkflowContext`) define our preparation state.
