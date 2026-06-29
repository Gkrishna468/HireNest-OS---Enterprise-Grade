import { db } from '../../../lib/firebase-admin.js';
import { BusinessEvent } from '../../services/EventBus.js';

export interface OfficeExecutionResult {
    success: boolean;
    reason?: string;
    actionTaken?: string;
    tokensUsed?: number;
    model?: string;
}

export abstract class BaseAIOffice {
    abstract readonly name: string;
    abstract readonly supportedEvents: string[];

    /**
     * Standard execution entrypoint.
     */
    async executeItem(inboxItemId: string, event: BusinessEvent): Promise<OfficeExecutionResult> {
        try {
            // Load Memory
            const memory = await this.loadMemory(event.orgId || 'GLOBAL');

            // Decision Engine
            const shouldAct = await this.decisionEngine(event, memory);
            if (!shouldAct) {
                await this.writeTelemetry(event, 'IGNORED', 'Decision engine opted not to act', 0);
                return { success: true, actionTaken: 'IGNORED' };
            }

            // Execute
            const result = await this.execute(event, memory);

            // Save Memory
            await this.saveMemory(event.orgId || 'GLOBAL', memory);

            // Write Telemetry
            await this.writeTelemetry(event, result.success ? 'COMPLETED' : 'FAILED', result.reason || 'Executed', result.tokensUsed || 0, result.model);

            return result;
        } catch (e: any) {
            console.error(`[${this.name}] Execution error:`, e);
            await this.writeTelemetry(event, 'ERROR', e.message, 0);
            return { success: false, reason: e.message };
        }
    }

    protected abstract decisionEngine(event: BusinessEvent, memory: any): Promise<boolean>;
    
    protected abstract execute(event: BusinessEvent, memory: any): Promise<OfficeExecutionResult>;

    protected async loadMemory(orgId: string): Promise<any> {
        if (!db) return {};
        const snap = await db.collection('office_memory').doc(`${this.name}_${orgId}`).get();
        return snap.exists ? snap.data() : {};
    }

    protected async saveMemory(orgId: string, memory: any): Promise<void> {
        if (!db) return;
        await db.collection('office_memory').doc(`${this.name}_${orgId}`).set(memory, { merge: true });
    }

    protected async writeTelemetry(event: BusinessEvent, status: string, reason: string, tokensUsed: number, model?: string) {
        if (!db) return;
        await db.collection('office_telemetry').add({
            office: this.name,
            eventId: event.eventId,
            eventType: event.type,
            status,
            reason,
            tokensUsed,
            model: model || 'none',
            executedAt: new Date().toISOString()
        });
    }
}
