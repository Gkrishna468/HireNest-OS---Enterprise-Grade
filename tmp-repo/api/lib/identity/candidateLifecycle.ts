export enum CandidateState {
  CREATED = "CREATED",
  VERIFIED = "VERIFIED",
  MATCHED = "MATCHED",
  SUBMITTED = "SUBMITTED",
  INTERVIEWING = "INTERVIEWING",
  OFFERED = "OFFERED",
  HIRED = "HIRED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED"
}

export function isValidTransition(currentState: CandidateState, nextState: CandidateState): boolean {
    // Defines valid state machine transitions to prevent random state jumping
    const validTransitions: Record<CandidateState, CandidateState[]> = {
        [CandidateState.CREATED]: [CandidateState.VERIFIED, CandidateState.ARCHIVED],
        [CandidateState.VERIFIED]: [CandidateState.MATCHED, CandidateState.ARCHIVED],
        [CandidateState.MATCHED]: [CandidateState.SUBMITTED, CandidateState.ARCHIVED],
        [CandidateState.SUBMITTED]: [CandidateState.INTERVIEWING, CandidateState.REJECTED, CandidateState.ARCHIVED],
        [CandidateState.INTERVIEWING]: [CandidateState.OFFERED, CandidateState.REJECTED, CandidateState.ARCHIVED],
        [CandidateState.OFFERED]: [CandidateState.HIRED, CandidateState.REJECTED],
        [CandidateState.HIRED]: [], // Terminal State
        [CandidateState.REJECTED]: [CandidateState.ARCHIVED],
        [CandidateState.ARCHIVED]: [CandidateState.CREATED] // Can be revived
    };

    return validTransitions[currentState]?.includes(nextState) || false;
}
