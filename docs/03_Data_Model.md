# System Data Model

## Client
- Name
- Industry
- Contact Person
- Active Requirements
- Total Placements
- Access Settings

## Vendor
- Agency Name
- Contact Person
- Associated Recruiters
- Performance Score
- Access Settings

## Recruiter
- Name
- Agency/Vendor ID (Optional)
- Placements
- Submissions
- Role/Permissions

## Requirement
- Client ID
- Title
- Skills
- Budget
- Priority
- Status
- Submissions

## Candidate
- Resume Data
- Skills
- Experience
- Domain
- AI Score

## Submission
- Candidate ID
- Requirement ID
- Vendor ID
- Recruiter ID
- Status
- Interview Status
- Interview Feedback
- Interview Rounds
- Offer Status
- Joining Status

*Note: Follow Single Source of Truth architecture. Every screen should read from these same objects.*
