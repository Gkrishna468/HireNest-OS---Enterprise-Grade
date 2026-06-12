# AI Agent Governance Policy

## 1. Core Principles
All autonomous or semi-autonomous AI agents operating within HireNestOS must adhere to the following governance principles:
- **Human-in-the-Loop Architecture**: AI predictions and assessments are advisory. Final decisions impacting hiring status, offers, or billing must require human approval unless explicitly automated by client policy.
- **Strict Role-Based Access Control (RBAC)**: Agents operate under scoped permissions. An agent cannot perform actions that exceed the permissions of its defined persona.
- **Auditability**: Every AI action, suggestion, and automated mutation must be logged centrally via the Event Bus with an `actorRole` of `AI_AGENT`.
- **Data Privacy & Isolation**: Agents must never bleed cross-tenant (client/vendor) data. Semantic searches and matching logic must strictly filter by the organizational boundaries context.

## 2. Approved Agent Personas

### 2.1. Strategic Matching Agent (MatchEngine)
**Purpose**: Scores and maps candidates against open requirements.
- **Can**: Read anonymized/public candidate profiles, read requirements, write to AI Match Scores subcollections, and publish `CANDIDATE_MATCHED` events.
- **Cannot**: Mutate candidate PII, alter job requirements, or automatically submit candidates to clients without Vendor/Recruiter approval.
- **Escalation Trigger**: Low confidence score on a critical requirement escalates to human Recruiter.

### 2.2. Interview Intelligence Agent (InterviewerBot)
**Purpose**: Generates interview questions, transcribes context, and analyzes candidate performance based on notes.
- **Can**: Read interview transcripts, read mapped requirement skills, draft feedback summaries, and publish `INTERVIEW_FEEDBACK_ADDED` events.
- **Cannot**: Modify overall submission status to "REJECTED" or "PASSED" autonomously.
- **Escalation Trigger**: Flagged negative sentiment or contradictory feedback is escalated to Hiring Manager.

### 2.3. Vendor Routing Agent (VendorIntelligence)
**Purpose**: Analyzes vendor performance and selectively routes mandates to high-performing external vendors.
- **Can**: Read vendor SLAs, read job descriptions, draft routing rules, and publish `JOB_PUBLISHED` events to specific vendor portals.
- **Cannot**: Override client-mandated vendor exclusion lists or negotiate vendor margins.

## 3. Forbidden AI Actions (Global Constraints)
Under no circumstances may ANY AI agent:
1. Mutate financial, invoice, or billing data.
2. Hard-delete entries from the Submission Ledger, Candidate Pool, or Requirement directories.
3. Automatically generate and send formal Offer Letters without a human client signature.
4. Attempt database schema modifications or bypass Service layer abstraction.

## 4. Enforcement Protocol
- Integration of new AI agents must pass the P1.5 Architecture Release Gate.
- The `SystemStore` will inject context boundaries before passing requests to any LLM.
- The `EventBus` drops unauthorized AI events that attempt to mutate protected System configurations.
