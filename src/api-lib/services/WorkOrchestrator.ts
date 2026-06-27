import { db } from '../../lib/firebase-admin.js';
import { EventBus } from './EventBus.js';

export interface WorkItem {
    id: string;
    workspaceId: string;
    officeId: string; // Target subscriber office or skill
    entityId: string;
    entityType: string;
    eventType: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    state: 'PENDING' | 'WORKING' | 'BLOCKED' | 'ESCALATED' | 'COMPLETED' | 'FAILED';
    owner: string;
    sla: string;
    createdAt: string;
    dueAt: string;
    payload: any;
    dedupKey: string;
    attempts: number;
    maxAttempts: number;
    error?: string;
    
    // Distributed Tracing
    traceId?: string;
    correlationId?: string;
    parentCorrelationId?: string;
    causationId?: string;
}

export class WorkOrchestrator {
    /**
     * Accepts a published event and orchestrates creating and routing appropriate work items
     * to the subscriber offices/skills.
     */
    static async orchestrateWork(event: { 
        eventId: string; 
        type: string; 
        payload: any; 
        orgId?: string;
        traceId?: string;
        correlationId?: string;
        parentCorrelationId?: string;
        causationId?: string;
    }, subscription: { subscriber: string; priority: number }) {
        if (!db) return;

        console.log(`[WorkOrchestrator] Orchestrating event ${event.type} for subscriber ${subscription.subscriber}`);

        const workspaceId = event.orgId || 'default-workspace';
        const dedupKey = `${event.eventId}_${subscription.subscriber}`;

        // 1. Check for Idempotency / Deduplication
        const existingDocs = await db.collection('work_items')
            .where('dedupKey', '==', dedupKey)
            .get();

        if (!existingDocs.empty) {
            console.log(`[WorkOrchestrator] Duplicate work item detected for dedupKey: ${dedupKey}. Skipping.`);
            return;
        }

        // 2. Priority Calculation
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        if (subscription.priority >= 8) {
            priority = 'HIGH';
        } else if (subscription.priority < 5) {
            priority = 'LOW';
        }

        // Check payload or content for urgent markers to override priority dynamically
        const subject = event.payload?.subject || '';
        const desc = event.payload?.description || '';
        if (subject.toLowerCase().includes('urgent') || desc.toLowerCase().includes('immediate') || subject.toLowerCase().includes('asap')) {
            priority = 'HIGH';
        }

        // 3. SLA & Scheduling Calculation
        let slaHours = 8;
        if (priority === 'HIGH') slaHours = 2;
        if (priority === 'LOW') slaHours = 24;

        const now = new Date();
        const dueAt = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

        // Extract Entity IDs if available
        const entityId = event.payload?.messageId || event.payload?.candidateId || event.payload?.requirementId || event.payload?.id || '';
        
        let entityType = 'UNKNOWN';
        if (event.type === 'EMAIL_RECEIVED') {
            entityType = 'EMAIL';
        } else if (event.type === 'REQUIREMENT_CREATED' || event.type === 'REQUIREMENT_UPDATED') {
            entityType = 'REQUIREMENT';
        } else if (event.type === 'RESUME_UPLOADED' || event.type === 'CANDIDATE_CREATED') {
            entityType = 'CANDIDATE';
        }

        // 4. Create Work Item in Generic Firestore Collection
        const workItemId = `work-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const workItem: WorkItem = {
            id: workItemId,
            workspaceId,
            officeId: subscription.subscriber,
            entityId,
            entityType,
            eventType: event.type,
            priority,
            state: 'PENDING',
            owner: subscription.subscriber,
            sla: `${slaHours} Hours`,
            createdAt: now.toISOString(),
            dueAt: dueAt.toISOString(),
            payload: event.payload,
            dedupKey,
            attempts: 0,
            maxAttempts: 3,
            
            // Distributed Tracing context
            traceId: event.traceId || `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            parentCorrelationId: event.correlationId || "",
            causationId: event.eventId,
            correlationId: `WK-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        };

        await db.collection('work_items').doc(workItemId).set(workItem);
        console.log(`[WorkOrchestrator] Successfully enqueued work item ${workItemId} in 'work_items' collection for subscriber ${subscription.subscriber}`);

        // Register event trace logs in mail_events or general work_events trace
        await db.collection('mail_events').add({
            messageId: entityId || `evt-${event.eventId}`,
            workspaceId,
            eventType: 'WORK_ITEM_CREATED',
            title: 'Work Item Created',
            description: `Work Orchestrator created work item for subscriber ${subscription.subscriber} with priority ${priority}`,
            timestamp: new Date()
        }).catch(() => {});

        return workItemId;
    }
}
