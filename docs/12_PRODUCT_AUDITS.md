# HireNestOS Product Audit System

This document outlines the repeatable AI Product Audit System used to evaluate the production readiness of HireNestOS before every major release.

## Scoring Scale
- **10** = Production Grade
- **8-9** = Launch Ready
- **6-7** = Beta Ready
- **4-5** = Functional Prototype
- **1-3** = Internal Demo Only

## Audit Categories

1. **Information Architecture (10%)**: Menu structure, navigation hierarchy, discoverability, duplicate screens, user flow clarity.
2. **Navigation UX (10%)**: Navigation consistency, active states, breadcrumbs, workflow continuity, back navigation.
3. **Content & Copywriting (10%)**: Recruiter-friendly language, vendor-friendly language, client-facing clarity, technical jargon removal.
4. **Data Quality & Integrity (15%)**: Duplicate prevention, candidate ownership, submission integrity, data drift, source of truth.
5. **Visual Design Consistency (10%)**: Typography, spacing, card consistency, colors, modals, tables.
6. **Feature Completeness (15%)**:
   - Candidate Flow (Upload, Parse, Match, Submit, Interview, Onboard)
   - Requirement Flow (Create, Match, Review, Close)
   - Client Flow (Receive, Review, Schedule, Select)
7. **Empty States (5%)**: "No candidates mapped yet. Upload resumes or use AI Matching."
8. **Accessibility (5%)**: Contrast, font size, keyboard support, focus states.
9. **Mobile Responsiveness (10%)**: Tablet, mobile, recruiter dashboard, candidate cards.
10. **Staffing Workflow Readiness (10%)**:
    - Vendor Workflow
    - Recruiter Workflow
    - Client Workflow
    - Admin Workflow

## AI Studio Production Audit Prompt

Use this exact prompt on every production release:

> You are a Senior Product Auditor, UX Architect, SaaS Reviewer, and Enterprise Software Consultant.
> Audit my live production application as if you were evaluating it for enterprise customer adoption.
> 
> Provide a detailed scorecard using the following categories:
> 1. Information Architecture (10%)
> 2. Navigation UX (10%)
> 3. Content & Copywriting (10%)
> 4. Data Quality & Integrity (15%)
> 5. Visual Design Consistency (10%)
> 6. Feature Completeness (15%)
> 7. Empty State Design (5%)
> 8. Accessibility (5%)
> 9. Mobile Responsiveness (10%)
> 10. Staffing Workflow Readiness (10%)
> 
> For each category provide:
> - Score (1-10)
> - Key Findings
> - Critical Issues
> - Recommendations
> 
> Then provide:
> 
> Overall Score:
> X/10
> 
> Production Readiness Status:
> - Not Ready
> - Internal Beta
> - External Beta
> - Launch Ready
> - Enterprise Ready
> 
> Then provide:
> Top 20 Issues Ranked By Business Impact
> 
> Finally create:
> 30-Day Improvement Plan
> 60-Day Improvement Plan
> 90-Day Improvement Plan
> 
> The application being audited is HireNestOS, an AI-native staffing operating system with Admin HQ, Vendor Workspace, Client Workspace, Candidate Pipeline, Requirement Management, Submission Orchestrator, Ownership Vault, Event Ledger, AI Matching, and Recruiter Analytics.

## Audit Log History

| Version | Date | AI Audit Score | Data Governance Score | UX Score | Workflow Score | Production Readiness |
|---------|------|----------------|------------------------|----------|----------------|----------------------|
| v1.0    | TBD  | TBD            | TBD                    | TBD      | TBD            | Beta Ready           |
