# HireNest OS Roadmap

This document serves as the shared product vision and timeline, aligning all AI and engineering efforts on future priorities.

## Current Sprint: Sprint 1 – AI Recruiter Copilot
**Status**: Planning / In Progress
- Resume analysis
- JD analysis
- Candidate fit reasoning
- Submission recommendations
- Skill gap analysis
- Interview preparation
- Salary benchmarking
- Email drafting
- Follow-up suggestions

## Next Sprints

### 🥈 Sprint 2 – Executive Dashboard
*AI COO dashboard for founders and managers.*
- Revenue today
- Pipeline value
- Recruiter productivity
- Vendor performance
- AI cost vs savings
- Placements
- Hiring velocity
- Risks

### 🥉 Sprint 3 – Vendor Intelligence
*Vendor performance insights.*
- Vendor trust score
- Vendor SLA adherence
- Submission quality
- Placement %
- Response time
- Candidate quality
- AI recommendations

### Sprint 4 – Marketplace
*Cross-vendor candidate and requirement matching.*
- Global AI Marketplace for matching Benches with Requirements.

### Sprint 5 – Knowledge Graph
*Relationship modeling for advanced AI reasoning.*
- Entities: Candidate → Vendor → Requirement → Submission → Interview → Placement → Revenue.

### Sprint 6 – Predictive Staffing
*Forecasting and proactive recommendations.*
- Predict skill demand.
- Predict vendor fulfillment capacity.

---

## Blockers
*(None currently reported)*

## Technical Debt
*(None currently reported - recently audited in Phase 4 transition)*

## Completed Milestones
- **Phase 1-4 Governance Transition**: Fully scaffolded `agents/` directory, strict SSOT Firestore rules, Centralized Event Bus, and AI Gateway configurations. 

---

## Recurring Audits (Prompts)

### Weekly Architecture Audit
> Act as Principal Engineer. Audit the repository. Find duplicated code, architectural drift, Firestore bottlenecks, dead code, AI Gateway violations, Event Bus violations. Produce report only.

### Weekly Cost Audit
> Estimate Firestore reads, Firestore writes, Storage, Bandwidth, AI token cost, Cloud Functions cost. Generate monthly projection.

### Monthly Security Audit
> Review OWASP, Firebase Rules, RBAC, ABAC, Secrets, Rate limiting, Injection. Do not modify code.
