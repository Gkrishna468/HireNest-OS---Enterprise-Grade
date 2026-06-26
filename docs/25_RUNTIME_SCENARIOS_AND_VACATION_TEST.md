# The Founder Vacation Test & Business Scenarios

## Shift in Engineering Philosophy
The architecture is 100% frozen. The product runtime is currently evaluated at 4/10. 
From this point forward, engineering progress is no longer measured by "features built" or "architectural layers implemented". It is strictly measured by **Business Scenarios Completed** and the ability to pass the **"Founder Vacation Test"**.

## The Founder Vacation Test
If the founder leaves for a week, HireNestOS must be capable of:
- Processing inbound client requirements autonomously.
- Parsing Gmail requirements continuously.
- Matching candidates to roles without prompting.
- Coordinating vendors, requesting missing profiles, and following up.
- Scheduling interviews and handling rejections via automated feedback extraction and coaching.
- Generating invoices when appropriate.
- Producing accurate morning briefings and end-of-day operational reports.
- Escalating to a human *only* when automation cannot safely proceed.

## The Business Decision Engine (The Brain)
To achieve this level of autonomy, the OS relies on the **Business Decision Engine** positioned above the Enterprise Scheduler.
`Business Goals` -> `Business Decision Engine` -> `Scheduler` -> `Office Runtime`

It continuously evaluates:
1. What work is highest value?
2. Which Office should execute it?
3. Should AI act automatically or is human approval required?
4. Is the AI cost justified?
5. Will this action improve today's objectives?

## The 20 Core Business Scenarios
Gate A and subsequent runtime milestones are only considered "Complete" when these end-to-end scenarios execute flawlessly in production through the event bus and the scheduler, without manual triggering.

1. **Requirement Intake:** Inbound email -> Parse -> Validate -> Publish `RequirementCreated`.
2. **Automated Sourcing:** `RequirementCreated` -> Search internal DB -> Rank -> Match -> Publish `CandidatesMatched`.
3. **Vendor Broadcasting:** Notify optimal vendors for a new requirement -> Set SLA -> Track responses.
4. **Submission Package Generation:** Validate candidate completeness -> Format submission -> Send to client.
5. **Rejection Handling & Intelligence:** Client Rejection -> Extract Feedback -> Update Candidate Memory -> Update Vendor Score -> Coach Vendor -> Trigger Re-match.
6. **Interview Scheduling:** Client requests interview -> Check availability -> Coordinate with candidate/vendor -> Confirm schedule.
7. **End-of-Day Reporting:** 18:00 trigger -> Aggregate placements, revenue, SLAs, AI costs -> Send Executive Report.
8. **Morning Briefing:** 08:45 trigger -> Forecast revenue, identify at-risk SLAs, propose daily objectives -> Send Executive Brief.
9. **GTM Outbound:** Discover prospects -> Qualify -> Generate personalized outreach -> Send -> Track replies.
10. **Client Follow-Up:** Detect stalled requirement -> Draft status update -> Send to client -> Update Requirement state.
*(And 10 additional domain-specific execution scenarios...)*

## Engineering Task Constraints
Every single engineering task must now answer:
1. **What business event triggers this?**
2. **Which Office owns the outcome?**
3. **What measurable KPI does it improve?**
4. **What learning is captured after execution?**
5. **How does this increase placements, meetings, revenue, or productivity?**

If a feature cannot answer these questions, it is rejected from the sprint.
