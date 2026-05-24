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
