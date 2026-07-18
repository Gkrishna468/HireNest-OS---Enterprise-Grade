# Definition of Done

A task is considered complete ONLY if all the following checks pass:

- [ ] **Architecture preserved**: The implementation aligns with established patterns.
- [ ] **No duplicate services**: Existing services were reused or extended.
- [ ] **No duplicate hooks**: Existing React hooks were utilized.
- [ ] **No duplicate repositories**: Existing repositories were used.
- [ ] **No duplicate collections**: Firestore schema remains intact.
- [ ] **Firestore indexes verified**: Queries are backed by `firestore.indexes.json`.
- [ ] **AI Gateway reused**: No direct LLM SDK calls were made.
- [ ] **Event Bus reused**: Events were leveraged over synchronous coupling.
- [ ] **Tests pass**: Existing and new tests pass successfully.
- [ ] **Build passes**: `npm run build` completes without errors.
- [ ] **Documentation updated**: PRDs, TRDs, or inline docs reflect changes.
- [ ] **Rollback documented**: A clear reversion strategy is established.
- [ ] **Performance impact documented**: Read/write/latency metrics are recorded.
- [ ] **Security impact documented**: ABAC and isolation rules are validated.
