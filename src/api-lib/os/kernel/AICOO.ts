import { OfficeHeartbeat } from '../office/BaseOffice.js';
import { EnterpriseRuntimeKernel } from './EnterpriseRuntimeKernel.js';

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
        // Allocate more capacity or redistribute work
    }

    public async getEnterpriseStatus() {
        return Array.from(this.heartbeats.values());
    }
}
