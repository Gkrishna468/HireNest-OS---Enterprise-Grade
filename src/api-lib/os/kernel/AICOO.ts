import { OfficeHeartbeat } from '../office/BaseOffice.js';
import { EnterpriseRuntimeKernel } from './EnterpriseRuntimeKernel.js';
import { db } from '../../../lib/firebase-admin.js';

/**
 * AI COO coordinates through Office heartbeats instead of database polling.
 */
export class AICOO {
    private heartbeats: Map<string, OfficeHeartbeat> = new Map();

    constructor() {
        this.initialize();
    }

    private initialize() {
        EnterpriseRuntimeKernel.event.subscribe('OFFICE_HEARTBEAT', async (payload: OfficeHeartbeat) => {
            this.heartbeats.set(payload.office, payload);
            await this.reviewEnterpriseHealth();
        });
    }

    /**
     * Reviews the health of the entire enterprise workforce.
     */
    private async reviewEnterpriseHealth() {
        for (const [office, heartbeat] of this.heartbeats.entries()) {
            if (heartbeat.health !== 'GREEN' || heartbeat.blocked) {
                await this.handleOfficeIssue(heartbeat);
            }

            if (heartbeat.sla < 80) {
                await this.handleSLABreach(heartbeat);
            }
        }
    }

    private async handleOfficeIssue(heartbeat: OfficeHeartbeat) {
        console.log(`[AI COO] Detected issue in ${heartbeat.office}: ${heartbeat.health} / Blocked: ${heartbeat.blocked}`);
        
        if (heartbeat.office === 'Recruitment' && heartbeat.blocked) {
            console.log(`[AI COO] Recruitment blocked. Delegating workload to Vendor Office.`);
            await EnterpriseRuntimeKernel.event.publish('DELEGATE_WORK', {
                from: 'Recruitment',
                to: 'Vendor',
                reason: 'Capacity overflow / Blocked status'
            });
        }
    }

    private async handleSLABreach(heartbeat: OfficeHeartbeat) {
        console.log(`[AI COO] Detected SLA breach in ${heartbeat.office}: ${heartbeat.sla}%`);
    }

    /**
     * Actively runs an automated escalation cycle over active submissions.
     * Checks stage age, calculates risk score, and triggers COO interventions.
     */
    public async runEscalationCycle(): Promise<any[]> {
        console.log('[AI COO] Starting active operational escalation scan...');
        const interventions: any[] = [];

        try {
            const snap = await db.collection('submissions').get();
            const now = new Date();

            for (const doc of snap.docs) {
                const sub = doc.data();
                if (!sub.sla || sub.sla.completedAt || sub.status === 'REJECTED' || sub.status === 'CLOSED') {
                    continue; // Skip finished or non-tracked submissions
                }

                const startedAt = new Date(sub.sla.startedAt);
                const deadline = new Date(sub.sla.deadline);
                const elapsedMs = now.getTime() - startedAt.getTime();
                const elapsedHours = elapsedMs / (1000 * 60 * 60);

                // Compute an Escalation Score (0 to 100)
                const targetHours = sub.sla.targetHours || 24;
                const escalationScore = Math.min(100, Math.round((elapsedHours / targetHours) * 100));

                let actionTaken = 'NONE';
                let alertLevel = 'GREEN';

                if (now > deadline) {
                    alertLevel = 'RED';
                    actionTaken = 'ESCALATE_TO_HQ';
                    
                    // Create HQ Alert
                    await db.collection('notifications').add({
                      type: 'SLA_BREACH',
                      title: '🚨 CRITICAL SLA BREACH: AI COO Intervening',
                      message: `Candidate ${sub.candidateName || 'Anonymous'} has been stuck in stage ${sub.status} for ${Math.round(elapsedHours)} hours (Target: ${targetHours}h). Escalating to HQ.`,
                      recipientId: 'ORG-GLOBAL-HQ',
                      createdAt: new Date(),
                      read: false
                    });

                    // Update SLA state
                    await doc.ref.update({
                        'sla.breached': true,
                        'sla.status': 'RED',
                        'sla.breachReason': 'AI COO auto-escalation: Target hours limit breached.'
                    });

                } else if (escalationScore > 75) {
                    alertLevel = 'YELLOW';
                    actionTaken = 'SEND_REMINDER';

                    // Send reminder notification to Client or Vendor
                    const recipientId = sub.status === 'SUBMITTED' ? sub.clientId : sub.vendorId;
                    if (recipientId) {
                        await db.collection('notifications').add({
                          type: 'SLA_WARNING',
                          title: '⏰ Action Required: SLA Limit Approaching',
                          message: `Submission for ${sub.candidateName || 'Anonymous'} is at risk of breach. Stage: ${sub.status} (${Math.round(elapsedHours)}h elapsed).`,
                          recipientId,
                          createdAt: new Date(),
                          read: false
                        });
                    }
                }

                if (actionTaken !== 'NONE') {
                    interventions.push({
                        submissionId: doc.id,
                        candidateName: sub.candidateName,
                        stage: sub.status,
                        elapsedHours: Math.round(elapsedHours),
                        escalationScore,
                        alertLevel,
                        actionTaken
                    });
                }
            }
        } catch (e) {
            console.error('[AI COO] Escalation cycle failed:', e);
        }

        console.log(`[AI COO] Active scan complete. Triggered ${interventions.length} interventions.`);
        return interventions;
    }

    public async getEnterpriseStatus() {
        return Array.from(this.heartbeats.values());
    }
}

