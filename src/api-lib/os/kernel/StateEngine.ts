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
        'CLIENT': ['LEAD', 'QUALIFIED', 'ACTIVE', 'HIRING', 'EXPANSION', 'RENEWAL'],
        'SUBMISSION': ['SUBMITTED', 'SHORTLISTED', 'L1', 'L2', 'CLIENT_ROUND', 'MANAGER_ROUND', 'HR_ROUND', 'OFFER', 'JOINED', 'CLOSED', 'REJECTED']
    };

    /**
     * Validates and performs state transitions for Business Graph nodes.
     */
    async transitionState(nodeType: string, currentState: string, newState: string, context?: { role: string, submissionId: string }): Promise<boolean> {
        const allowedStates = this.transitions[nodeType];
        if (!allowedStates) return true; // Generic nodes don't have strict transitions

        const normalizedCurrent = (currentState || 'SUBMITTED').toUpperCase();
        const normalizedNew = newState.toUpperCase();

        // 1. Role-based Guardrails
        if (context) {
            const { role, submissionId } = context;
            const isVendor = role.includes('vendor') || role === 'recruiter';
            
            // Vendors cannot manually reject candidates or move pipeline stages
            if (isVendor && (normalizedNew === 'REJECTED' || (normalizedCurrent !== 'REJECTED' && normalizedNew !== 'SUBMITTED'))) {
                console.warn(`[StateEngine] Rejected transition: Vendor attempted unauthorized transition to ${normalizedNew}`);
                return false;
            }
        }

        const currentIndex = allowedStates.indexOf(normalizedCurrent);
        const nextIndex = allowedStates.indexOf(normalizedNew);

        // Allow transition to REJECTED from any valid stage except closed/joined
        if (normalizedNew === 'REJECTED' && normalizedCurrent !== 'CLOSED' && normalizedCurrent !== 'JOINED') {
            await this.logEvent(context?.submissionId || 'unknown', normalizedCurrent, normalizedNew);
            return true;
        }

        // Allow transition back to SUBMITTED if currently REJECTED (Recovery / Resubmission path)
        if (normalizedCurrent === 'REJECTED' && normalizedNew === 'SUBMITTED') {
            await this.logEvent(context?.submissionId || 'unknown', normalizedCurrent, normalizedNew);
            return true;
        }

        // Linear progression checks
        if (nextIndex > currentIndex) {
            await this.logEvent(context?.submissionId || 'unknown', normalizedCurrent, normalizedNew);
            return true;
        }

        return false;
    }

    private async logEvent(submissionId: string, fromState: string, toState: string): Promise<void> {
        if (submissionId === 'unknown') return;
        try {
            // Write to an immutable collection of submission events
            await db.collection('submission_events').add({
                submissionId,
                fromState,
                toState,
                timestamp: new Date().toISOString(),
            });
            console.log(`[StateEngine] Immutable event logged: Submission ${submissionId} transitioned from ${fromState} to ${toState}`);
        } catch (e) {
            console.error('[StateEngine] Error writing submission event log:', e);
        }
    }
}

