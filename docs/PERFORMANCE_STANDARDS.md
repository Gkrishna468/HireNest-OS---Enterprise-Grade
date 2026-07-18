# Performance Standards

1. **Latency Threshold**: API handlers must preserve latency under 200ms for primary HTTP requests.
2. **Read/Write Minimization**: Minimize Firestore reads and writes by heavily utilizing caching, partial document projection (`.select`), and bulk operations.
3. **Indexes**: Complex queries must be backed by explicit Firestore composite indexes.
4. **Offloading**: Expensive computations and large N+1 operations must be offloaded to background workers via the Event Bus.
