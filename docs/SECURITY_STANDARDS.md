# Security Standards

1. **Zero Trust & ABAC**: Never trust client requests. Implement strict Attribute-Based Access Control in `firestore.rules` and backend API handlers.
2. **PII Data Isolation**: Strict read rules must isolate PII data to exact stakeholders (e.g., `request.auth.uid == resource.id`).
3. **Input Validation**: Rigorously validate all inputs (`zod` schemas or strict typing) before processing or database mutations.
4. **Error Masking**: Do not leak stack traces or raw database permissions errors to the client.
5. **AI Guardrails**: All AI inputs and outputs must pass toxicity and PII guardrails.
