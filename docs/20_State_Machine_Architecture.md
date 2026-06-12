# Interview State Machine Architecture

This document dictates the canonical flow for Interview projections in the HireNestOS system as of Phase 4.5.
No workflow component may violate these states. The `InterviewWorkflow.validateTransition()` ensures all transitions follow these paths.

## Primary Happy Path

1. **`INTERVIEW_REQUESTED`**
   * Trigger: Client clicks "Request Interview".
   * Data Added: Preferred date, time, interviewer group (Panel), notes.
   * Target Ownership: Vendor pending to provide availability.
   * Deal Room Projected automatically.

2. **`AVAILABILITY_PENDING`**
   * Vendor examines the request.
   * If vendor misses 24h SLA -> System triggers escalation.

3. **`SCHEDULING` / `AVAILABILITY_COLLECTED`**
   * Trigger: Vendor provides available time slots.
   * Data Added: Available Slots list.
   * Target Ownership: Client selects confirming slot.

4. **`SCHEDULED`**
   * Trigger: Client confirms a specific date/time/link.
   * Data Added: Final Meeting Link, strict date/time.

5. **`COMPLETED`**
   * Trigger: System automation (time elapsed) OR Recruiter clicks "Complete".

6. **`FEEDBACK_PENDING`**
   * Trigger: Interview completed, pending recruiter scoring.
   
7. **`DECISION_PENDING`** (or FEEDBACK_SUBMITTED)
   * Trigger: Client provides initial score / technical review.
   * Needs final offer or passing to next round.

8. **`PASSED` / `SHORTLISTED`** OR **`REJECTED`**
   * Terminal states for this round.

## Banned / Illegal Transitions

The temporal worker and workflow orchestrator must formally reject the following:
* **`REJECTED` → `SCHEDULED`** 
  * Reason: Reject is a terminal node. Recommencing requires a new Submission or Deal Room.
* **`SELECTED` → `FEEDBACK_PENDING`**
  * Reason: Once marked as passed/selected, moving backwards violates the event sourcing log. Must create a new interview round.
* **`COMPLETED` → `REQUESTED`**
  * Reason: Completed interview cannot revert to 'requested'. A new interview round must be triggered instead.

## Source of Truth Reference

*   `Candidate` entity owns: Name, Skills, Experience, Match Score.
*   `Submission` entity owns: Candidate reference, current interview status, interview round metadata.
*   `Deal Room` is a generic collaborative container, tracking participants and messages for a specific `Submission`.
*   Kanban Board directly consumes `Submission` to derive state and renders the Projection natively. Any UI updates on Kanban strictly translate to mutation events over `Submission` state.
