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
    traceId?: string;
    correlationId?: string;
    parentCorrelationId?: string;
    causationId?: string;
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
        const parentCorrelationId = traceContext?.parentCorrelationId || payload?.correlationId || "";
        const causationId = traceContext?.causationId || payload?.eventId || "";
        const correlationId = traceContext?.correlationId || `EV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const event: BusinessEvent = {
            eventId,
            type,
            payload,
            source,
            createdAt: new Date().toISOString(),
            orgId,
            traceId,
            correlationId,
            parentCorrelationId,
            causationId
        };

        // 1. Record the event in the events collection
        await db.collection('business_events').doc(event.eventId).set(event);

        // 2. Enqueue to AI COO
        const { AICOORuntime } = await import('../os/kernel/AICOORuntime.js');
        await AICOORuntime.enqueueEvent(event);

        return event.eventId;
    }
}
