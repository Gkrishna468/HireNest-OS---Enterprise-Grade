# Production Readiness & Vibe Coding Checklist Rules

The user has explicitly requested to incorporate rules from the PWP Plugin (Project Workflow Protocol) and the "Vibe Coding Production Readiness Checklist: 50 Things to Check Before You Ship".

## PWP Discipline
When modifying code in this project, you must act with structured discipline rather than guessing:
- **Understand** before acting. Check `package.json`, read existing configurations.
- **Plan** before executing. Do not hotfix.
- **Execute** with single-responsibility commits (or edits).
- **Verify** results. Ensure `npm run lint` and `npm run build` pass.
- **Security Audit:** Ensure Firestore rules use Attribute-Based Access Control (ABAC), strict schema blueprints (`hasOnly`, size limits), secure list queries, and no blanket reads.

## Vibe Coding Checklist (Production Guidelines)
When generating or modifying features, you MUST verify the following before completion:

1. **No Fake Infrastructure:** Do NOT mock database calls if Firebase is set up. Use real Firestore interactions. 
2. **Environment Variables:** Never commit secrets. Ensure new API keys are documented in `.env.example`.
3. **Admin Panels & RBAC:** Admin views must verify role credentials (e.g., verifying custom claims or admin collections). Never rely solely on client-side hiding of UI elements.
4. **Data Isolation (PII):** If any PII is stored, it must be subject to strict Firestore read rules (e.g. `request.auth.uid == resource.id`).
5. **Input Validation:** Backend operations (like Cloud Functions or Firestore rules) must rigorously check `request.resource.data` keys, types, and limits. Do not trust client-side validation.
6. **Graceful Error Handling:** If Firebase throws "Missing or insufficient permissions", provide an explicit JSON error payload referencing `FirestoreErrorInfo` so developers can trace the issue.
7. **No Console Logs in Production:** Strip `console.log()` for sensitive payloads. 
8. **Cost Management & Caching:** Avoid `getDocs` over unbounded collections. Limit queries and use pagination.
9. **UI Stability:** Ensure "Loading" and "Error" states exist for every async operation.
10. **Deployment Safety:** Do not deploy Firestore rules without testing. If the rules are updated, run eslint over them first.

You are expected to self-enforce these 10 core constraints and refer to this document on every task.

## Vibe Coding Security Audit Alignment
In addition to the production checklist, this workspace strictly enforces and implements security policies based on the [Vibe Coding Security Checklist](https://gist.github.com/mdsaban/29ffbb6974ce2fa9acc37415b9a4b684). A comprehensive codebase audit has been executed, with explicit upload hardenings applied to `/api/extract-text.ts`. Detailed resolutions and safety vectors are logged in `/VIBE_CHECKLIST_RESOLVED.md` for continuous maintenance.

## Google Agent Skills & Well-Architected Framework (WAF) Integration
This workspace implements Google Agent Skills from `github.com/google/skills`. The following Google Cloud **Well-Architected Framework (WAF)** and enterprise principles must be enforced throughout the platform's architecture:

1. **Security by Design & Zero Trust (`google-cloud-waf-security`)**: Implement deep defense layers. IAM roles (admin, client, vendor) must be strictly isolated at the database, backend, and API layers (Attribute-Based Access Control). Never trust client requests without verification. Vendors must only see their own candidates; Admins have global views.
2. **Shift-Left Security & Cyber Defense (`google-cloud-waf-security`)**: Catch vulnerabilities early. Ensure input validation on data parsed from resumes/JDs and strictly type backend models. Monitor error logs to gracefully catch API failures securely.
3. **Operational Excellence & Reliability (`google-cloud-waf-operational-excellence`, `google-cloud-waf-reliability`)**: Graceful state recovery, resilient API calls, scaling considerations for the active OS matching systems, and detailed status/error boundaries for loading states.
4. **Performance & Cost Optimization (`google-cloud-waf-performance-optimization`, `google-cloud-waf-cost-optimization`)**: Minimize large payload transfers. Limit Firestore fetch operations, utilize indexes heavily for global candidate pool matching, and constrain vector search spaces.
5. **Firebase Skills Implementation (`firebase-basics`)**: For Firebase features, rely firmly on standard client/admin setups.
6. **AI Safety & Governance**: Use Gemini Models responsibly to augment recruitment intelligence, never to leak PII. Ensure AI outputs are sanitized and grounded.

## Current Sprint Directive: Production Readiness Certification (PRC)
Effective immediately, the primary focus of development is the **Production Readiness Certification**. 
We are temporarily pausing net-new AI capability development (no autonomous recruiting, no AI interviewing, no AI deal room routing) to prioritize:
1. **Data Integrity** Validation
2. **Ownership Integrity** Validation 
3. **Lifecycle Integrity** Validation (Matched -> Submitted -> Shortlisted -> Interview -> Offer -> Joined -> Placement -> Invoice -> Payment)
4. **Multi-Tenant Protection** Validation (Vendor vs Client vs HQ)

Every architectural or code change MUST be strictly validated against the 6-Stage Gate (Product Manager, Software Architect, Firestore Auditor, Governance Auditor, Security Auditor, AI Matching Auditor) as documented in `docs/20_PRODUCTION_READINESS_CERTIFICATION.md`. AI Matching is restricted to Layer 1 (Deterministic), Layer 2 (Semantic Inference), and Layer 3 (Recruiter Override). Recruiter insights ALWAYS win over AI predictions.
