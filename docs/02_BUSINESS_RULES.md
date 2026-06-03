# Business Rules Document

## Candidate Ownership Rules
- **Ownership = First Valid Submission**: The first vendor or recruiter to submit a candidate with a valid resume hash or unique identifier (Email/Phone) owns the candidate.
- **Ownership Duration**: 180 days from the date of submission.
- **Ownership Transfer**: Requires manual Admin approval and is logged in the Event Ledger.

## Duplicate Detection Rules
- **Email Matching**: Exact match on email string.
- **Phone Matching**: Exact match on normalized phone number.
- **Resume Hash**: SHA-256 hash of the extracted resume text buffer.

## Submission Rules
- Vendors can only submit to Public/Assigned Requirements.
- Submissions must route through the duplicate detection handler before creating a `submissions` record.
- Re-submissions for the same candidate to the same job are blocked unless the previous submission was explicitly rejected and the lock period expired.

## Permissions & Flow
- Vendors cannot see other vendors' submitted candidates.
- Clients can only see candidates explicitly submitted to their jobs.
- Recruiters (Admins) see all.
