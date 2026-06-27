import { EnterpriseRuntimeKernel } from '../kernel/EnterpriseRuntimeKernel.js';
import { BusinessGraphService, BusinessGraphNode } from '../../services/BusinessGraphService.js';

export interface OfficeHeartbeat {
    office: string;
    capacity: number;
    queue: number;
    health: 'GREEN' | 'YELLOW' | 'RED';
    blocked: boolean;
    sla: number;
    forecastPlacements: number;
    forecastRevenue: number;
    slaRisk: number;
    aiCost: number;
    confidence: number;
    timestamp: string;
}

/**
 * BaseOffice provides the standard runtime contract for all Offices in HireNestOS.
 */
export abstract class BaseOffice {
    abstract readonly name: string;
    abstract readonly mission: string;

    /**
     * The primary entry point for work processing.
     */
    async processWork(workItem: any): Promise<void> {
        // Inbox
        const context = await this.inbox(workItem);

        // Planner
        const plan = await this.planner(context);

        // Decision
        const decision = await this.decision(plan);

        // Worker
        const result = await this.worker(decision);

        // Reviewer
        const validatedResult = await this.reviewer(result);

        // Learner
        await this.learner(validatedResult);

        // Outbox
        await this.outbox(validatedResult);

        // Emit Heartbeat
        await this.emitHeartbeat();
    }

    protected abstract inbox(workItem: any): Promise<any>;
    protected abstract planner(context: any): Promise<any>;
    protected abstract decision(plan: any): Promise<any>;
    protected abstract worker(decision: any): Promise<any>;
    protected abstract reviewer(result: any): Promise<any>;
    /**
     * Learner routes all experience/knowledge updates to the ContinuousImprovementEngine.
     */
    protected async learner(result: any): Promise<void> {
        await EnterpriseRuntimeKernel.improvement.updateExperience(
            result.orgId || 'GLOBAL', 
            this.name, 
            {
                result: result,
                timestamp: new Date().toISOString()
            }
        );
    }

    protected abstract outbox(result: any): Promise<void>;

    protected async emitHeartbeat(): Promise<void> {
        const heartbeat: OfficeHeartbeat = {
            office: this.name,
            capacity: 100, 
            queue: 0,
            health: 'GREEN',
            blocked: false,
            sla: 100,
            forecastPlacements: 0,
            forecastRevenue: 0,
            slaRisk: 0,
            aiCost: 0,
            confidence: 1,
            timestamp: new Date().toISOString()
        };

        await EnterpriseRuntimeKernel.event.publish('OFFICE_HEARTBEAT', heartbeat);
    }

    protected async getExperience(orgId: string, targetId: string): Promise<any[]> {
        // Retrieve experience memory specific to this target and office
        return await EnterpriseRuntimeKernel.improvement.getExperiencesForTarget(orgId, targetId);
    }

    protected async getKnowledge(): Promise<any[]> {
        // Retrieve knowledge specific to this office
        return [];
    }
}
