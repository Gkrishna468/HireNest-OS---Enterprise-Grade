# AI Engineering Charter (Master Rules)

This charter governs all future AI agent executions within the HireNest OS repository. If these rules conflict with a user request, the agent MUST ask for clarification before making changes.

## Governance Domains

1. [Architecture Principles](./ARCHITECTURE_PRINCIPLES.md)
2. [Firestore Governance](./FIRESTORE_GOVERNANCE.md)
3. [AI Gateway Policy](./AI_GATEWAY_POLICY.md)
4. [Event Bus Governance](./EVENT_BUS_GOVERNANCE.md)
5. [Performance Standards](./PERFORMANCE_STANDARDS.md)
6. [Security Standards](./SECURITY_STANDARDS.md)
7. [Code Review Checklist](./CODE_REVIEW_CHECKLIST.md)
8. [Implementation Template](./IMPLEMENTATION_TEMPLATE.md)
9. [Decision Log](./DECISION_LOG.md)
10. [Business Rules](./BUSINESS_RULES.md)
11. [Domain Glossary](./DOMAIN_GLOSSARY.md)
12. [API Contracts](./API_CONTRACTS.md)

## Engineering Workflow Gates
10. [Design Review Gate](./DESIGN_REVIEW_GATE.md)
11. [Definition of Done](./DEFINITION_OF_DONE.md)
12. [Cost Governance](./COST_GOVERNANCE.md)

## Architecture Decision Records (ADRs)
- [ADR-001: Firestore SSOT](./adr/ADR-001_Firestore_SSOT.md)
- [ADR-002: Event Bus](./adr/ADR-002_Event_Bus.md)
- [ADR-003: AI Gateway](./adr/ADR-003_AI_Gateway.md)
- [ADR-004: Candidate Ownership](./adr/ADR-004_Candidate_Ownership.md)
- [ADR-005: Vendor Ownership](./adr/ADR-005_Vendor_Ownership.md)
- [ADR-006: Repository Pattern](./adr/ADR-006_Repository_Pattern.md)

## Universal Verification Mandate
- Never assume the repository is fully understood.
- Verify relevant modules, search the repository, cite inspected files, and state assumptions before acting.
- Prioritize: correctness, maintainability, scalability, security, and backward compatibility.
