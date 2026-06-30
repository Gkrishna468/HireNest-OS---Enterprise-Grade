import { db } from '../../lib/firebase-admin.js';
import { AgentOrchestrator } from './AgentOrchestrator.js';
import { WorkOrchestrator } from './WorkOrchestrator.js';
import { BusinessEvent } from '../os/kernel/RuntimeTypes.js';

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
            { id: 'sub-match-client', eventType: 'MATCH_COMPLETED', subscriber: 'ClientOffice', priority: 8, enabled: true },
            { id: 'sub-req-matching-created', eventType: 'REQUIREMENT_CREATED', subscriber: 'matching-office', priority: 10, enabled: true },
            { id: 'sub-req-matching-updated', eventType: 'REQUIREMENT_UPDATED', subscriber: 'matching-office', priority: 10, enabled: true },
            { id: 'sub-req-matching-closed', eventType: 'REQUIREMENT_CLOSED', subscriber: 'matching-office', priority: 10, enabled: true },
            { id: 'sub-cand-matching-created', eventType: 'CANDIDATE_CREATED', subscriber: 'matching-office', priority: 10, enabled: true },
            { id: 'sub-cand-matching-updated', eventType: 'CANDIDATE_UPDATED', subscriber: 'matching-office', priority: 10, enabled: true },
            { id: 'sub-cand-matching-withdrawn', eventType: 'CANDIDATE_WITHDRAWN', subscriber: 'matching-office', priority: 10, enabled: true }
        ];
        
        for (const sub of defaultSubs) {
            await db.collection('event_subscriptions').doc(sub.id).set(sub);
        }
        console.log('[EventBus] Successfully seeded event subscription registry.');
    }

    // Register business events and route to appropriate agents
    static async publish(type: string, payload: any, source: string = 'SYSTEM', orgId?: string, traceContext?: {
        traceId?: string;
        correlationId?: string;
        parentCorrelationId?: string;
        causationId?: string;
    }) {
        if (!db) return;

        const eventId = `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const traceId = traceContext?.traceId || payload?.traceId || `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const causationId = traceContext?.causationId || payload?.eventId || "";
        const correlationId = traceContext?.correlationId || `EV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const entityId = payload?.id || payload?.requirementId || payload?.candidateId || payload?.matchId || payload?.submissionId || 'unknown';
        
        // Derive entityType heuristically from event type
        const entityType = type.split('_')[0] || 'UNKNOWN';

        const event: BusinessEvent = {
            eventId,
            eventType: type, // standard field
            type, // legacy
            eventVersion: 1,
            correlationId,
            causationId,
            entityType,
            entityId,
            tenantId: orgId || payload?.orgId || payload?.organizationId || 'GLOBAL',
            source,
            priority: 'NORMAL', // Default priority, AI COO can adjust
            createdAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            retryCount: 0,
            traceId,
            payload,
            metadata: {
                parentCorrelationId: traceContext?.parentCorrelationId || payload?.correlationId || ""
            },
            orgId // legacy
        };

        // 1. Record the event in the events collection
        await db.collection('business_events').doc(event.eventId).set(event);

        const { FeatureFlags } = await import('../os/kernel/FeatureFlags.js');
        if (FeatureFlags.OUTBOX_PATTERN_ENABLED) {
            // Write to Outbox instead of direct queueing
            await db.collection('outbox_events').doc(event.eventId).set({
                event,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            });

            // Trigger Outbox Dispatcher
            const { OutboxDispatcher } = await import('../os/kernel/OutboxDispatcher.js');
            OutboxDispatcher.dispatchOutbox().catch(e => console.error('[EventBus] Outbox trigger failed', e));
        } else {
            await this.publishInternal(event);
        }

        return event.eventId;
    }

    static async publishInternal(event: BusinessEvent) {
        // Build the Business Graph
        const { BusinessGraph } = await import('../os/kernel/BusinessGraph.js');
        await BusinessGraph.buildFromEvent(event.eventType, event.payload).catch(e => console.error('[EventBus] Graph build failed', e));

        // 2. Enqueue to AI COO
        const { AICOORuntime } = await import('../os/kernel/AICOORuntime.js');
        await AICOORuntime.enqueueEvent(event);
    }
}
