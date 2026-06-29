import { db } from '../../../lib/firebase-admin.js';
import { BusinessEvent } from '../../services/EventBus.js';

export class AICOORuntime {
    
    /**
     * Called by the Event Bus to enqueue a business event for the AI COO.
     */
    static async enqueueEvent(event: BusinessEvent) {
        if (!db) return;
        await db.collection('coo_inbox').add({
            eventId: event.eventId,
            type: event.type,
            status: 'PENDING',
            enqueuedAt: new Date().toISOString(),
            priority: 'NORMAL'
        });
        
        // Trigger background processing (non-blocking)
        this.triggerProcessing().catch(e => console.error('[AICOORuntime] trigger failed', e));
    }

    private static async triggerProcessing() {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/ops?action=process_coo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(() => { /* ignore */ });
    }

    /**
     * Processes the COO inbox. Looks at PENDING events, determines which offices
     * should act, and enqueues tasks for those offices.
     */
    static async processInbox() {
        if (!db) return;
        const snap = await db.collection('coo_inbox')
            .where('status', '==', 'PENDING')
            .orderBy('enqueuedAt', 'asc')
            .limit(20)
            .get();

        if (snap.empty) return;

        const batch = db.batch();
        for (const doc of snap.docs) {
            const data = doc.data();
            const eventId = data.eventId;
            const eventType = data.type;

            // Mark as processing
            batch.update(doc.ref, { status: 'PROCESSING', processedAt: new Date().toISOString() });

            // Determine offices based on eventType
            const targetOffices = this.determineOffices(eventType);

            for (const office of targetOffices) {
                const inboxRef = db.collection('office_inbox').doc();
                batch.set(inboxRef, {
                    office,
                    eventId,
                    eventType,
                    status: 'PENDING',
                    enqueuedAt: new Date().toISOString(),
                    retryCount: 0
                });
            }

            // Mark COO inbox item as complete
            batch.update(doc.ref, { status: 'COMPLETED' });
        }
        await batch.commit();

        // Trigger office processing
        this.triggerOfficeProcessing().catch(e => console.error('[AICOORuntime] trigger office failed', e));
    }

    private static determineOffices(eventType: string): string[] {
        const routes: Record<string, string[]> = {
            'REQUIREMENT_CREATED': ['MatchingOffice', 'VendorOffice', 'ClientOffice', 'MarketplaceOffice'],
            'REQUIREMENT_UPDATED': ['MatchingOffice', 'ClientOffice'],
            'REQUIREMENT_CLOSED': ['MatchingOffice', 'ClientOffice'],
            'CANDIDATE_CREATED': ['MatchingOffice'],
            'CANDIDATE_UPDATED': ['MatchingOffice'],
            'CANDIDATE_WITHDRAWN': ['MatchingOffice'],
            'MATCH_CREATED': ['RecruitmentOffice', 'VendorOffice', 'NotificationOffice'],
            'SUBMISSION_CREATED': ['RecruitmentOffice', 'VendorOffice'],
            'INTERVIEW_SCHEDULED': ['RecruitmentOffice', 'NotificationOffice'],
            'FEEDBACK_RECEIVED': ['RecruitmentOffice'],
            'OFFER_RELEASED': ['RecruitmentOffice', 'ClientOffice', 'NotificationOffice'],
            'PAYMENT_RECEIVED': ['VendorOffice', 'NotificationOffice'],
            'BENCH_UPDATED': ['MarketplaceOffice'],
            'VENDOR_UPDATED': ['MarketplaceOffice']
        };

        const offices = routes[eventType] || [];
        // Analytics and Knowledge consume all
        return Array.from(new Set([...offices, 'AnalyticsOffice', 'KnowledgeOffice']));
    }

    private static async triggerOfficeProcessing() {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/ops?action=process_offices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(() => { /* ignore */ });
    }
}
