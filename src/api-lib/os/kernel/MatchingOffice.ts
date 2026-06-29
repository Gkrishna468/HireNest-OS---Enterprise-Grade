import { BaseAIOffice, OfficeExecutionResult } from './BaseAIOffice.js';
import { BusinessEvent } from '../../services/EventBus.js';
import { MatchingOffice as LegacyMatchingOffice } from '../../services/MatchingOffice.js';
import { db } from '../../../lib/firebase-admin.js';

export class MatchingOffice extends BaseAIOffice {
    readonly name = 'MatchingOffice';
    readonly supportedEvents = [
        'REQUIREMENT_CREATED',
        'REQUIREMENT_UPDATED',
        'REQUIREMENT_CLOSED',
        'CANDIDATE_CREATED',
        'CANDIDATE_UPDATED',
        'CANDIDATE_WITHDRAWN'
    ];

    protected async decisionEngine(event: BusinessEvent, memory: any): Promise<boolean> {
        // Matching Office computes matching for any of its supported events.
        return this.supportedEvents.includes(event.type);
    }

    protected async execute(event: BusinessEvent, memory: any): Promise<OfficeExecutionResult> {
        await LegacyMatchingOffice.handleEvent(event.type, event.payload, event.orgId);
        return { success: true, actionTaken: 'Processed Match', tokensUsed: 1500, model: 'gemini-1.5-flash' };
    }

    /**
     * Processes events in the `office_inbox` for this office
     */
    public async processQueue() {
        if (!db) return;

        const snap = await db.collection('office_inbox')
            .where('office', '==', this.name)
            .where('status', '==', 'PENDING')
            .orderBy('enqueuedAt', 'asc')
            .limit(10)
            .get();

        if (snap.empty) return;

        const batch = db.batch();
        const activeTasks = snap.docs.map(doc => {
            batch.update(doc.ref, { status: 'PROCESSING', processedAt: new Date().toISOString() });
            return { id: doc.id, data: doc.data(), ref: doc.ref };
        });
        await batch.commit();

        for (const task of activeTasks) {
            try {
                const eventDoc = await db.collection('business_events').doc(task.data.eventId).get();
                if (eventDoc.exists) {
                    const event = eventDoc.data() as BusinessEvent;
                    await this.executeItem(task.id, event);
                }
                await task.ref.update({ status: 'COMPLETED' });
            } catch (e: any) {
                console.error(`[MatchingOffice] Error processing task ${task.id}`, e);
                await task.ref.update({ status: 'FAILED', error: e.message });
            }
        }
    }
}
