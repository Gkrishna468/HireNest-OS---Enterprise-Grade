---
title: Office Registry
version: 1.0.0
last_updated: 2026-06-29
status: active
---

# Office Registry

This document lists the active AI Offices available to the AI COO Runtime.

## 1. Recruitment Office
- **Version**: 2.1
- **Domain**: Workflow orchestration, candidate pipeline management, SLA enforcement, and assignment.
- **Capabilities**:
  - `workflow.orchestrate`
  - `recruiter.recommendation`
- **Supported Events**: `REQUIREMENT_CREATED`, `REQUIREMENT_UPDATED`, `REQUIREMENT_CLOSED`, `MATCH_CREATED`, `SUBMISSION_CREATED`, `INTERVIEW_SCHEDULED`, `FEEDBACK_RECEIVED`, `OFFER_RELEASED`, `SOURCING_SLA_BREACH`, `PIPELINE_STALLED`
- **Permissions**:
  - **Read**: requirements, candidates, workflows, business_graph, users
  - **Write**: assignments, human_tasks, workflows, business_events
- **SLA**: Target latency < 5s.

## 2. Matching Office
- **Version**: 1.0
- **Domain**: Candidate evaluation, semantic similarity scoring, matrix regeneration.
- **Capabilities**:
  - `candidate.semantic_match`
  - `resume.parse`
- **Supported Events**: `REQUIREMENT_CREATED`, `REQUIREMENT_UPDATED`, `CANDIDATE_CREATED`, `CANDIDATE_UPDATED`
- **Permissions**:
  - **Read**: candidates, requirements, business_graph
  - **Write**: matches, business_events
- **SLA**: Target latency < 8s.

## Planned Offices
- **Vendor Office**: Manages third-party vendor relationships, payouts, and broadcast logic.
- **Client Office**: Generates updates, manages expectations, handles incoming requests from Clients.
- **Notification Office**: Aggregates omni-channel notifications (email, slack, sms).
- **Knowledge Office**: Manages the enterprise RAG layer, internal documentation, and process answering.
- **Analytics Office**: Collects metrics, spots trends, identifies stalled pipelines, generates executive reports.
