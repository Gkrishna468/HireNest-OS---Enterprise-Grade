# API Contracts

This document outlines the strict contracts for public and internal APIs.

1. **Public Endpoints**: All external integrations must use versioned API routes (e.g., `/api/v1/...`).
2. **Request Schemas**: All incoming payloads must be strictly validated using Zod or equivalent typing before processing.
3. **Response Schemas**: Successful requests must return a standardized JSON structure: `{ success: true, data: {...} }`.
4. **Error Codes**: Errors must not leak internal logic or database state. Standardized HTTP codes (400, 401, 403, 404, 500) must be used, accompanied by a generic safe error message.
5. **Versioning Rules**: Breaking changes require a major version bump (e.g., `v2`).
6. **Backward Compatibility Policy**: APIs must be additive. Existing fields or expected responses cannot be mutated or removed if active consumers exist.
