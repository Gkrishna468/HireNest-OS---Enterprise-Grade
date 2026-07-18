# ADR-006: Repository Pattern

- **Date**: 2026-07-18
- **Status**: Accepted
- **Context**: Directly embedding database queries (e.g., `adminDb.collection(...)`) inside Express route handlers makes the codebase difficult to test, hard to refactor, and prone to duplicated queries.
- **Decision**: Adopt a lightweight Repository Pattern. Database access logic must be abstracted into dedicated services or repository classes (e.g., `src/api-lib/services/CandidateRepository.ts`) rather than inlined in HTTP handlers.
- **Alternatives considered**:
  - Direct inline queries (Rejected: Poor maintainability and testability).
  - Heavy ORM (Rejected: Firebase Admin SDK is sufficient; heavy ORMs add unnecessary mapping overhead).
- **Consequences**:
  - Enforces cleaner separation of concerns.
  - Allows easy mocking for unit tests.
  - Prevents query duplication across multiple endpoints.
