# State Architecture

## Source of Truth Flow
Data flow synchronization must strictly follow this descending pattern:
`Firestore` ➔ `Services` ➔ `State Store / Context` ➔ `UI Components`

## Explicitly Prohibited
To prevent Candidate 360 and submission duplication bugs, the following patterns are strictly forbidden:
- `Component` ➔ `Firestore` (Direct reads/writes from components)
- `Component` ➔ `Local Duplicate State` (Duplicating global data into isolated component states)
- `Component` ➔ `Alternative Data Models` (Creating parallel data structures that diverge from the Master TRD)
