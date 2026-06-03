# Frontend Specification Document

## UI Layouts & Workspaces
- **Admin/Recruiter Console**: Global overview, matching diagnostics, drift resolution, ledger monitoring.
- **Vendor Workspace**: Streamlined to view open public requisitions and submit candidates with instant deduplication feedback.
- **Client Workspace**: Feedback-oriented Kanban/list pipeline for active submissions.
- **Candidate Vault**: Read-only highly standardized view of candidate profiles.

## Design System
- **Colors**: Slate, Indigo (Accent), Rose (Errors), Emerald (Success), Amber (Warnings).
- **Typography**: Inter (Body), Space Grotesk (Display / Highlights).
- **State Feedback**: Ensure `Loading` and `Error` states exist for every async operation.
