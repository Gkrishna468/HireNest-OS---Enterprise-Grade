import { db } from '../../lib/firebase-admin.js';
import { AgentOrchestrator } from './AgentOrchestrator.js';
import { WorkOrchestrator } from './WorkOrchestrator.js';

export interface BusinessEvent {
    eventId: string;
    type: string; // e.g., 'REQUIREMENT_CREATED', 'RESUME_UPLOADED', 'CANDIDATE_MATCHED'
    payload: any;
    source: string; // 'UI', 'Webhook', 'Cron'
    createdAt: string;
    orgId?: string;
}

export class EventBus {
    
    // Seed default subscriptions if none exist to guarantee an operational foundation
    private static async ensureDefaultSubscriptions() {
        if (!db) return;
        
        const subSnap = await db.collection('event_subscriptions').limit(1).get();
        if (!subSnap.empty) return; // Already seeded
        
        console.log('[EventBus] No event subscriptions found. Seeding default subscription registry...');
        
        const defaultSubs = [
            { id: 'sub-email-resume', eventType: 'EMAIL_RECEIVED', subscriber: 'ResumeParserSkill', priority: 10, enabled: true },
            { id: 'sub-email-requirement', eventType: 'EMAIL_RECEIVED', subscriber: 'RequirementParserSkill', priority: 10, enabled: true },
            { id: 'sub-email-recruitment', eventType: 'EMAIL_RECEIVED', subscriber: 'RecruitmentOffice', priority: 8, enabled: true },
            { id: 'sub-req-recruitment', eventType: 'REQUIREMENT_CREATED', subscriber: 'RecruitmentOffice', priority: 10, enabled: true },
            { id: 'sub-req-matching', eventType: 'REQUIREMENT_CREATED', subscriber: 'MatchingEngine', priority: 10, enabled: true },
            { id: 'sub-req-vendor', eventType: 'REQUIREMENT_CREATED', subscriber: 'VendorOffice', priority: 8, enabled: true },
            { id: 'sub-cand-vendor', eventType: 'CANDIDATE_CREATED', subscriber: 'VendorOffice', priority: 10, enabled: true },
            { id: 'sub-cand-recruitment', eventType: 'CANDIDATE_CREATED', subscriber: 'RecruitmentOffice', priority: 8, enabled: true },
            { id: 'sub-match-recruitment', eventType: 'MATCH_COMPLETED', subscriber: 'RecruitmentOffice', priority: 10, enabled: true },
            { id: 'sub-match-client', eventType: 'MATCH_COMPLETED', subscriber: 'ClientOffice', priority: 8, enabled: true }
        ];
        
        for (const sub of defaultSubs) {
            await db.collection('event_subscriptions').doc(sub.id).set(sub);
        }
        console.log('[EventBus] Successfully seeded event subscription registry.');
    }

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

        // 2. Ensure default subscription registry is ready
        try {
            await this.ensureDefaultSubscriptions();
        } catch (seedErr) {
            console.error('[EventBus] Failed to ensure default subscriptions:', seedErr);
        }

        // 3. Look up active registry subscriptions for this event type
        try {
            const registrySnap = await db.collection('event_subscriptions')
                .where('eventType', '==', type)
                .where('enabled', '==', true)
                .get();

            for (const doc of registrySnap.docs) {
                const sub = doc.data();
                // Route directly to the WorkOrchestrator
                await WorkOrchestrator.orchestrateWork(event, {
                    subscriber: sub.subscriber,
                    priority: sub.priority || 5
                });
            }
        } catch (subErr) {
            console.error('[EventBus] Error processing registry subscriptions:', subErr);
        }

        // 4. Backwards compatible check: Look up legacy subscriptions for this event type
        try {
            const agentsSnap = await db.collection('ai_agents')
                .where('triggerType', '==', 'EVENT')
                .where('enabled', '==', true)
                .get();

            for (const agentDoc of agentsSnap.docs) {
                const data = agentDoc.data();
                if (data.triggerEvent === type || data.triggerEvent === 'ANY_EVENT') {
                    const agentId = agentDoc.id;
                    await AgentOrchestrator.enqueueJob(agentId, {
                        eventId: event.eventId,
                        eventType: type,
                        payload
                    }, 'medium', orgId);
                }
            }
        } catch (legacyErr) {
            console.error('[EventBus] Error processing legacy agent triggers:', legacyErr);
        }

        return event.eventId;
    }
}
