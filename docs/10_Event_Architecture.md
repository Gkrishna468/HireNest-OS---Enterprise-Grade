# Event Driven Architecture

HireNestOS is a workflow-driven application. We favor event-driven workflows instead of UI components orchestrating multiple system updates.

## Core Tenet
- **Do not** write to 5 different collections from a single UI React component.
- **Do** trigger an Event -> Services -> Workflows to handle asynchronous data synchronization.

## Example: Submission Created Lifecycle

```text
Event: SUBMISSION_CREATED
    ↓
    ├── Task: AI Match Score Generated (Async)
    ├── Task: Vendor Notified
    ├── Task: Client Notified
    └── Task: Analytics Updated
```

## Example: Interview Scheduled

```text
Event: INTERVIEW_SCHEDULED
    ↓
    ├── Task: Calender Invites Sent
    ├── Task: Candidate Status Updated (On Submission)
    ├── Task: Vendor Notified
    └── Task: Client Workspace Dashboard Updated
```

By decoupling these processes, the master state remains consistent, and UI clients don't handle complex transactions.
