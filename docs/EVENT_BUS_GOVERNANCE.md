# Event Bus Governance

1. **Catalog First**: Never create new events before checking `EVENT_CATALOG.md`.
2. **Reuse**: Reuse existing events whenever possible.
3. **New Event Requirements**: If a new event is absolutely required, you must explain:
   - Publisher (Who emits it?)
   - Subscriber (Who listens?)
   - Payload (Exact schema)
   - Reason (Why existing events fail to satisfy this domain requirement)
