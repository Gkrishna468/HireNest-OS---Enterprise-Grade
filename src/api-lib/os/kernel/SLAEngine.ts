import { db } from '../../../lib/firebase-admin.js';

export interface SLADetails {
    targetHours: number;
    startedAt: string;
    deadline: string;
    pausedAt?: string;
    completedAt?: string;
    breached: boolean;
    breachReason?: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
}

export class SLAEngine {
    /**
     * Initializes an SLA configuration for a specific submission and stage.
     */
    async initiateSLA(submissionId: string, stage: string): Promise<SLADetails> {
        // Default target hours for various stages
        let targetHours = 24; // Default 24 hours
        if (stage === 'SUBMITTED') targetHours = 24;
        else if (stage === 'SHORTLISTED') targetHours = 48;
        else if (stage.startsWith('INTERVIEW') || stage.includes('ROUND')) targetHours = 72;
        else if (stage === 'OFFER') targetHours = 96;

        const startedAt = new Date();
        const deadline = new Date(startedAt.getTime() + targetHours * 60 * 60 * 1000);

        const sla: SLADetails = {
            targetHours,
            startedAt: startedAt.toISOString(),
            deadline: deadline.toISOString(),
            breached: false,
            status: 'GREEN'
        };

        try {
            await db.collection('submissions').doc(submissionId).update({ sla });
        } catch (e) {
            console.error(`[SLAEngine] Error updating submission SLA for ${submissionId}:`, e);
        }

        return sla;
    }

    /**
     * Marks the current SLA as completed.
     */
    async completeSLA(submissionId: string, reason?: string): Promise<void> {
        try {
            const subRef = db.collection('submissions').doc(submissionId);
            const subSnap = await subRef.get();
            if (!subSnap.exists) return;

            const data = subSnap.data() || {};
            const currentSla = data.sla as SLADetails;
            if (!currentSla) return;

            const completedAt = new Date();
            const deadlineDate = new Date(currentSla.deadline);
            const breached = completedAt > deadlineDate;

            await subRef.update({
                'sla.completedAt': completedAt.toISOString(),
                'sla.breached': breached,
                'sla.status': breached ? 'RED' : 'GREEN',
                'sla.breachReason': breached ? (reason || 'Stage SLA limit exceeded') : undefined
            });
        } catch (e) {
            console.error(`[SLAEngine] Error completing SLA for ${submissionId}:`, e);
        }
    }

    /**
     * Evaluates a submission SLA and returns its current alert level.
     */
    async checkSLA(submissionId: string): Promise<{ status: 'GREEN' | 'YELLOW' | 'RED', timeRemaining?: number }> {
        try {
            const subRef = db.collection('submissions').doc(submissionId);
            const subSnap = await subRef.get();
            if (!subSnap.exists) return { status: 'GREEN' };

            const data = subSnap.data() || {};
            const sla = data.sla as SLADetails;
            if (!sla || sla.completedAt) {
                return { status: 'GREEN' };
            }

            const now = new Date();
            const deadline = new Date(sla.deadline);
            const started = new Date(sla.startedAt);

            const totalDuration = deadline.getTime() - started.getTime();
            const elapsed = now.getTime() - started.getTime();
            const timeRemaining = deadline.getTime() - now.getTime();

            let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
            let breached = false;

            if (now > deadline) {
                status = 'RED';
                breached = true;
            } else if (elapsed > totalDuration * 0.75) {
                // If more than 75% of time has elapsed
                status = 'YELLOW';
            }

            // Update status in db if changed
            if (status !== sla.status || breached !== sla.breached) {
                await subRef.update({
                    'sla.status': status,
                    'sla.breached': breached
                });
            }

            return { status, timeRemaining: Math.max(0, timeRemaining) };
        } catch (e) {
            console.error(`[SLAEngine] Error checking SLA for ${submissionId}:`, e);
            return { status: 'GREEN' };
        }
    }
}

