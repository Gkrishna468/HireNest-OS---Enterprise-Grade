import { db } from '../../../lib/firebase-admin.js';

export interface StateTransition {
    from: string;
    to: string;
}

/**
 * StateEngine enforces deterministic state transitions for business entities.
 */
export class StateEngine {
    private transitions: Record<string, string[]> = {
        'REQUIREMENT': ['NEW', 'QUALIFIED', 'MATCHING', 'VENDOR_BROADCAST', 'SUBMISSION_PENDING', 'SUBMITTED', 'INTERVIEW', 'OFFER', 'PLACED', 'INVOICE', 'CLOSED'],
        'CANDIDATE': ['INGESTED', 'PARSED', 'ENRICHED', 'MATCHED', 'SUBMITTED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'PLACED', 'ACTIVE'],
        'VENDOR': ['REGISTERED', 'VERIFIED', 'ACTIVE', 'RESPONDING', 'PREFERRED', 'DORMANT'],
        'CLIENT': ['LEAD', 'QUALIFIED', 'ACTIVE', 'HIRING', 'EXPANSION', 'RENEWAL']
    };

    /**
     * Validates and performs state transitions for Business Graph nodes.
     */
    async transitionState(nodeType: string, currentState: string, newState: string): Promise<boolean> {
        const allowedStates = this.transitions[nodeType];
        if (!allowedStates) return true; // Generic nodes don't have strict transitions

        const currentIndex = allowedStates.indexOf(currentState);
        const nextIndex = allowedStates.indexOf(newState);

        // Strict linear transition for now, can be expanded to a matrix
        if (nextIndex > currentIndex) {
            return true;
        }

        return false;
    }
}
