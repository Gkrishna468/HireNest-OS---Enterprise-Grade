# Design Review Gate

Before any implementation over a certain size begins, a formal Design Review must be produced and approved.

**STOP AND PRODUCE A DESIGN REVIEW IF A FEATURE:**
- Modifies more than 10 files
- Changes the Firestore schema
- Changes the Event Bus (`system_events` or `EVENT_CATALOG.md`)
- Changes the AI Gateway
- Introduces new infrastructure or external services
- Changes the authentication model

Do not proceed with code generation until the Design Review is explicitly approved by the user.
