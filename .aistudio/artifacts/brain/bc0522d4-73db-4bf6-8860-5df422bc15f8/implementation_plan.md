# Implementation Plan: Deal Room UI Remediation (HN-008/Submission Hub)

## 1. Architectural Analysis
The Deal Room UI in `DealRoomsTab.tsx` incorrectly defaults to an empty state when a newly submitted candidate (pre-interview) is selected in the Submission Hub. The current system logic assumes Deal Rooms are only functional at the `interview` stage, leading to incomplete or unusable UI state for submissions. This violates the goal of seamless recruiter/vendor collaboration.

## 2. Proposed Changes
- **Update Deal Room Initialization**: Ensure `MatchIntelligenceTab` properly initializes the `currentStage` field (defaulting to 'shortlisted') when creating a new deal room via the "Submit" action.
- **Remediate UI Rendering Logic**: Update `DealRoomsTab.tsx` to display the Deal Room interface immediately upon submission, allowing initial vendor-recruiter collaboration, even if full interview-stage features are locked.
- **Enable Early Collaboration**: Implement conditional UI rendering in `DealRoomCopilot` and `DealRoomsTab` to safely expose collaboration tools based on the deal room's state (pre-interview vs. active-interview).
- **Audit Data Integrity**: Ensure all newly created deal rooms have `clientId`, `vendorId`, `candidateId`, and `requirementId` populated correctly to avoid UI crashes or filtering mismatches. All reads/writes must maintain strict tenant isolation (ABAC).

## 3. Implementation Steps
1. **Audit & Patch Creation Logic**: Modify `src/views/MatchIntelligenceTab.tsx` to include `currentStage: "shortlisted"` and verify all required IDs (clientId, vendorId, candidateId, requirementId) are passed to the `dealRooms` collection.
2. **UI Rendering Fix**: Modify `DealRoomsTab.tsx` to render the right-side collaboration panel when `selectedRoom` is present, regardless of `currentStage`.
3. **Collaboration Capability Locking**: Implement a light capability check to lock down interview-specific tools (e.g., calendar scheduling) until the interview stage is reached, while keeping chat and basic candidate info unlocked.
4. **Data Integrity & Security Audit**: Validate that the new `dealRooms` document satisfies ABAC requirements.
5. **Validation**: Test submission-to-deal-room transition in the dev environment. Verify no PII leakage.

## 4. Verification
- Verify that clicking a submission in Submission Hub correctly loads the right-side panel.
- Confirm that chat is available immediately upon submission.
- Ensure interview-stage features are appropriately gated.
- Ensure logs do not reveal PII and Firestore rules permit access based on tenant/user role.
