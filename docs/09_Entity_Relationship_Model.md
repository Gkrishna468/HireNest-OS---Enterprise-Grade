# Canonical Entity Relationship Model

This document defines the core entity relationship hierarchy across HireNestOS. The Submission is the operational backbone connecting all identities and requirements.

```text
Client
  │
  └── Requirement
          │
          └── Submission
                    │
                    └── Candidate

Vendor
   │
   └── Submission

Recruiter
   │
   └── Submission
```

### Constraints
- **Avoid direct Candidate -> Requirement relationships:** A Candidate matches a Requirement via a Submission object.
- **Submissions are the source of truth for workflow state:** Interview schedules, feedback, pricing, offers, and hiring status live on the Submission, NOT the Candidate or the Requirement.
