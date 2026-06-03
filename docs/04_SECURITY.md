# Security & Access Document

## Role Matrix
| Role | Read | Write | Delete |
|---|---|---|---|
| Admin | All | All | Limited (Super Admin) |
| Recruiter | Assigned Data | Assigned Data | No |
| Vendor | Own Data (Submissions, Candidates) | Own Data | No |
| Client | Submitted Candidates to their Jobs | Feedback/Stage Update Only | No |

## Firestore Rules
Implementation relies heavily on Attribute-Based Access Control (ABAC):
- Users are assigned roles (e.g., `GLOBAL_ADMIN`, `GLOBAL_VENDOR`, `GLOBAL_CLIENT`) stored in user claims or documents.
- `candidatePool` read is restricted to the owning vendor or admins.
- `submissions` restricted by `vendorId` or `clientId`.

## Audit Logs & Event Ledger Restrictions
- **`eventLedger`** allows `create` operations but denies `update` and `delete` to all standard users, guaranteeing immutability.
