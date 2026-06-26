import { db } from '../../lib/firebase-admin.js';
import { AgentOrchestrator } from './AgentOrchestrator.js';

export interface BusinessEvent {
    eventId: string;
    type: string; // e.g., 'REQUIREMENT_CREATED', 'RESUME_UPLOADED', 'CANDIDATE_MATCHED'
    payload: any;
    source: string; // 'UI', 'Webhook', 'Cron'
    createdAt: string;
    orgId?: string;
}

export class EventBus {
    
    // Register business events and route to appropriate agents
    static async publish(type: string, payload: any, source: string = 'SYSTEM', orgId?: string) {
        if (!db) return;

        const event: BusinessEvent = {
            eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            type,
            payload,
            source,
            createdAt: new Date().toISOString(),
            orgId
        };

        // 1. Record the event in the events collection
        await db.collection('business_events').doc(event.eventId).set(event);

        // 2. Look up subscriptions for this event type
        const agentsSnap = await db.collection('ai_agents')
            .where('triggerType', '==', 'EVENT')
            .where('enabled', '==', true)
            .get();

        for (const agentDoc of agentsSnap.docs) {
            const data = agentDoc.data();
            if (data.triggerEvent === type || data.triggerEvent === 'ANY_EVENT') {
                const agentId = agentDoc.id;
                // 3. Enqueue job for each subscribed agent
                await AgentOrchestrator.enqueueJob(agentId, {
                    eventId: event.eventId,
                    eventType: type,
                    payload
                }, 'medium', orgId);
            }
        }

        return event.eventId;
    }
}
