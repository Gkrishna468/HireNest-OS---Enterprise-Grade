# ADR-005: Vendor Ownership

- **Date**: 2026-07-18
- **Status**: Accepted
- **Context**: In a multi-tenant staffing OS, third-party agencies (vendors) must be able to submit candidates to client requirements without seeing other vendors' data or bypassing client controls.
- **Decision**: Implement strict Vendor Ownership via `organizationId` binding and Attribute-Based Access Control (ABAC) in Firestore rules.
- **Alternatives considered**:
  - Separate database instances per vendor (Rejected: Breaks the centralized marketplace and matching capabilities).
- **Consequences**:
  - Vendors can only read/write submissions and candidates tied to their specific `organizationId`.
  - Global AI matching can still securely parse all candidates on behalf of the Admin/Client without exposing data to unauthorized vendors.
