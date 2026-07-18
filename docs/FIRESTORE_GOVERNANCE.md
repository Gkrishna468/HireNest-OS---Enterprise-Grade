# Firestore Governance

1. **Single Source of Truth**: Firestore is the SSOT for the entire system.
2. **No Unbounded Scans**: Never scan entire collections.
3. **Pagination**: Never use unbounded queries. Always use `.limit()` or cursors.
4. **No N+1 Reads**: Never perform N+1 reads in loops. Use batched operations or `Promise.all`.
5. **Indexing**: Never filter in memory when Firestore indexes can be used.
6. **Cost Transparency**: Always explain expected read/write costs before implementation.
