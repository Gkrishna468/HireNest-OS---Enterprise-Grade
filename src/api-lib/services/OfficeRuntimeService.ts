import { db } from '../../lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { AgentOrchestrator } from './AgentOrchestrator.js';
import { EventBus } from './EventBus.js';

export type OfficeState = 
    | 'IDLE' 
    | 'RECEIVING_WORK' 
    | 'PRIORITIZING' 
    | 'EXECUTING' 
    | 'WAITING' 
    | 'BLOCKED' 
    | 'ESCALATED' 
    | 'COMPLETED' 
    | 'LEARNING';

export interface OfficeInboxItem {
    id: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    sourceEntityId: string;
    sourceEntityType: string;
    description: string;
    status: 'PENDING' | 'WORKING' | 'BLOCKED' | 'ESCALATED' | 'COMPLETED';
    dueAt: string;
}

export interface OfficeMemory {
    shortTerm: any[]; // Today's work
    working: any[];   // Active workflows
    longTerm: any;    // Historical KPIs
    knowledge: any[]; // Business learning (e.g., "Vendor X performs well for Banking")
}

export interface DailyObjective {
    metric: string;
    target: number;
    current: number;
}

export interface AIPerformanceScore {
    workReceived: number;
    workCompleted: number;
    averageTimeMs: number;
    successRate: number;
    revenueGenerated: number;
    cost: number;
    qualityScore: number;
}

export interface OfficeRuntime {
    officeId: string;
    managerName: string;
    state: OfficeState;
    objectives: DailyObjective[];
    performanceScore: AIPerformanceScore;
    inbox: OfficeInboxItem[];
    memory: OfficeMemory;
    outbox: any[]; // Today's output logs
}

/**
 * The OfficeRuntimeService manages the runtime state, memories, inboxes, and outboxes of AI Offices.
 * It is fully backed by highly-scalable, generic collections to eliminate size bottlenecks and guarantee multi-tenant security rules.
 */
export class OfficeRuntimeService {
    
    // Generates possible office query keys to guarantee resilient database operations
    private static getOfficeIdKeys(officeType: string): string[] {
        const type = officeType.toUpperCase();
        return [
            type,
            officeType,
            officeType.toLowerCase(),
            `${officeType.toLowerCase()}-office`,
            `${officeType.charAt(0).toUpperCase()}${officeType.slice(1).toLowerCase()}Office`
        ];
    }

    static async getOfficeRuntime(workspaceId: string, officeType: string): Promise<OfficeRuntime | null> {
        if (!db) return null;
        
        const runtimeRef = db.collection('office_runtimes').doc(`${workspaceId}_${officeType}`);
        const runtimeDoc = await runtimeRef.get();
        const officeKeys = this.getOfficeIdKeys(officeType);
        
        // 1. Fetch Dynamic Inbox from generic 'work_items' collection (Prevents Firestore document size limitations!)
        const inbox: OfficeInboxItem[] = [];
        try {
            const workItemsSnap = await db.collection('work_items')
                .where('workspaceId', '==', workspaceId)
                .where('officeId', 'in', officeKeys)
                .get();

            workItemsSnap.forEach(doc => {
                const d = doc.data();
                const mappedStatus: OfficeInboxItem['status'] = 
                    d.state === 'COMPLETED' ? 'COMPLETED' :
                    d.state === 'FAILED' ? 'ESCALATED' :
                    d.state === 'ESCALATED' ? 'ESCALATED' :
                    d.state === 'WORKING' ? 'WORKING' :
                    d.state === 'BLOCKED' ? 'BLOCKED' : 'PENDING';

                inbox.push({
                    id: doc.id,
                    priority: d.priority || 'MEDIUM',
                    sourceEntityId: d.entityId || '',
                    sourceEntityType: d.entityType || '',
                    description: d.payload?.subject || d.payload?.description || d.eventType || 'Business Workflow Operation',
                    status: mappedStatus,
                    dueAt: d.dueAt || new Date().toISOString()
                });
            });
        } catch (inboxErr) {
            console.error(`[OfficeRuntimeService] Error loading work_items inbox for ${officeType}:`, inboxErr);
        }

        // 2. Fetch Dynamic Memory from 'office_memory' collection (Split across SHORT, WORKING, LONG, KNOWLEDGE types)
        const shortTerm: any[] = [];
        const working: any[] = [];
        let longTerm: any = { fillRate: 0, slaAverage: 0 };
        const knowledge: any[] = [];

        try {
            const memoryDocs = await db.collection('office_memory')
                .where('workspaceId', '==', workspaceId)
                .where('officeId', '==', officeType)
                .get();

            memoryDocs.forEach(doc => {
                const d = doc.data();
                if (d.type === 'SHORT') shortTerm.push(d.content);
                else if (d.type === 'WORKING') working.push(d.content);
                else if (d.type === 'LONG') longTerm = d.content;
                else if (d.type === 'KNOWLEDGE') knowledge.push(d.content);
            });
        } catch (memErr) {
            console.error(`[OfficeRuntimeService] Error loading memory for ${officeType}:`, memErr);
        }

        // 3. Fetch Dynamic Outbox decisions from 'office_outbox' collection (Explainable AI audit trails)
        const outbox: any[] = [];
        try {
            const outboxDocs = await db.collection('office_outbox')
                .where('workspaceId', '==', workspaceId)
                .where('officeId', '==', officeType)
                .orderBy('createdAt', 'desc')
                .limit(30)
                .get();

            outboxDocs.forEach(doc => {
                outbox.push(doc.data());
            });
        } catch (outboxErr) {
            console.warn(`[OfficeRuntimeService] Error loading outbox logs for ${officeType}. Performing in-memory fallback:`, outboxErr);
            // Fallback: If composite index isn't ready, load without ordering and sort in-memory
            try {
                const rawDocs = await db.collection('office_outbox')
                    .where('workspaceId', '==', workspaceId)
                    .where('officeId', '==', officeType)
                    .get();

                const sorted = rawDocs.docs
                    .map(d => d.data())
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                outbox.push(...sorted.slice(0, 30));
            } catch (fallbackErr) {
                console.error(`[OfficeRuntimeService] In-memory outbox sort fallback failed:`, fallbackErr);
            }
        }

        if (!runtimeDoc.exists) {
            // Seed base configurations
            const newRuntime: Omit<OfficeRuntime, 'inbox' | 'memory' | 'outbox'> = {
                officeId: `${workspaceId}_${officeType}`,
                managerName: `${officeType.charAt(0).toUpperCase()}${officeType.slice(1).toLowerCase()} Manager AI`,
                state: 'IDLE',
                objectives: [
                    { metric: 'submissions', target: 15, current: 0 },
                    { metric: 'interviews', target: 5, current: 0 },
                    { metric: 'offers', target: 2, current: 0 },
                    { metric: 'placements', target: 1, current: 0 }
                ],
                performanceScore: {
                    workReceived: 0,
                    workCompleted: 0,
                    averageTimeMs: 0,
                    successRate: 100,
                    revenueGenerated: 0,
                    cost: 0,
                    qualityScore: 100
                }
            };
            await runtimeRef.set(newRuntime);
            
            return {
                ...newRuntime,
                inbox,
                memory: { shortTerm, working, longTerm, knowledge },
                outbox
            };
        }
        
        const baseData = runtimeDoc.data() || {};
        return {
            officeId: baseData.officeId || `${workspaceId}_${officeType}`,
            managerName: baseData.managerName || `${officeType} Manager AI`,
            state: baseData.state || 'IDLE',
            objectives: baseData.objectives || [],
            performanceScore: baseData.performanceScore || {
                workReceived: 0,
                workCompleted: 0,
                averageTimeMs: 0,
                successRate: 100,
                revenueGenerated: 0,
                cost: 0,
                qualityScore: 100
            },
            inbox,
            memory: { shortTerm, working, longTerm, knowledge },
            outbox
        };
    }
    
    static async appendToInbox(workspaceId: string, officeType: string, item: Omit<OfficeInboxItem, 'id' | 'status'>) {
        if (!db) return;
        
        const id = `work-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const priority = item.priority || 'MEDIUM';
        
        // Add to work_items
        await db.collection('work_items').doc(id).set({
            id,
            workspaceId,
            officeId: officeType,
            entityId: item.sourceEntityId || '',
            entityType: item.sourceEntityType || 'UNKNOWN',
            eventType: 'MANUAL_INBOX_ADD',
            priority,
            state: 'PENDING',
            owner: officeType,
            sla: priority === 'HIGH' ? '2 Hours' : (priority === 'MEDIUM' ? '8 Hours' : '24 Hours'),
            createdAt: new Date().toISOString(),
            dueAt: item.dueAt || new Date(Date.now() + (priority === 'HIGH' ? 2 : (priority === 'MEDIUM' ? 8 : 24)) * 60 * 60 * 1000).toISOString(),
            payload: {
                subject: item.description,
                description: item.description
            }
        });
        
        await this.updateOfficeState(workspaceId, officeType, 'RECEIVING_WORK');
    }

    static async updateOfficeState(workspaceId: string, officeType: string, state: OfficeState) {
        if (!db) return;
        const runtimeRef = db.collection('office_runtimes').doc(`${workspaceId}_${officeType}`);
        await runtimeRef.update({ state });
    }

    /**
     * Executes the Office Manager routine.
     * The Manager reviews work_items, prioritizes them, triggers Skill execution, logs to Outbox, updates memory and KPIs.
     */
    static async executeManagerRoutine(workspaceId: string, officeType: string) {
        if (!db) return;
        
        console.log(`[OfficeRuntimeService] Executing Manager Routine for ${officeType} Office in ${workspaceId}`);
        await this.updateOfficeState(workspaceId, officeType, 'PRIORITIZING');
        
        const officeKeys = this.getOfficeIdKeys(officeType);
        
        // Fetch pending, working, and blocked items
        const snap = await db.collection('work_items')
            .where('workspaceId', '==', workspaceId)
            .where('officeId', 'in', officeKeys)
            .get();
            
        if (snap.empty) {
            console.log(`[OfficeRuntimeService] No work items found for ${officeType}. Returning to IDLE.`);
            await this.updateOfficeState(workspaceId, officeType, 'IDLE');
            return [];
        }

        const now = new Date();
        const updatedInbox: OfficeInboxItem[] = [];

        for (const doc of snap.docs) {
            const item = doc.data();
            const originalState = item.state;
            let targetState = originalState;
            let targetPriority = item.priority || 'MEDIUM';

            const dueDate = item.dueAt ? new Date(item.dueAt) : now;

            if (originalState === 'PENDING') {
                if (dueDate < now) {
                    targetState = 'ESCALATED';
                    targetPriority = 'HIGH';
                    
                    // Log Decision to Office Outbox
                    await db.collection('office_outbox').add({
                        id: `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        workspaceId,
                        officeId: officeType,
                        workItemId: item.id,
                        decision: 'ESCALATION',
                        reason: `Work item is past its SLA due date (${item.dueAt}). Auto-escalating.`,
                        executionTime: 0,
                        cost: 0,
                        tokens: 0,
                        confidence: 100,
                        publishedEvents: ['SLA_BREACHED'],
                        createdAt: new Date().toISOString()
                    });

                    // Update database
                    await doc.ref.update({ state: targetState, priority: targetPriority });
                } else {
                    targetState = 'WORKING';
                    await doc.ref.update({ state: targetState, startedAt: new Date().toISOString() });
                    await this.updateOfficeState(workspaceId, officeType, 'EXECUTING');

                    // Log Working state
                    console.log(`[OfficeRuntimeService] Running skill for work item ${item.id} of office ${officeType}`);

                    const startExecution = Date.now();
                    let success = true;
                    let executionOutput: any = null;
                    let errorMsg = '';

                    // Execute matching Skill/Agent
                    try {
                        let agentId = 'resume-parser';
                        if (officeType === 'RECRUITMENT') {
                            agentId = 'RECRUITMENT_MORNING_PROCESSING';
                        } else if (officeType === 'VENDOR') {
                            agentId = 'CANDIDATE_IMPROVEMENT_AGENT';
                        } else if (officeType === 'CLIENT') {
                            agentId = 'REQUIREMENT_IMPROVEMENT_AGENT';
                        }

                        executionOutput = await AgentOrchestrator.executeAgentLogic(agentId, {
                            workspaceId,
                            workItemId: item.id,
                            entityId: item.entityId,
                            entityType: item.entityType,
                            payload: item.payload
                        });
                    } catch (err: any) {
                        success = false;
                        errorMsg = err?.message || String(err);
                    }

                    const executionTime = Date.now() - startExecution;

                    if (success) {
                        targetState = 'COMPLETED';
                        await doc.ref.update({ state: 'COMPLETED', finishedAt: new Date().toISOString() });

                        // Log to Outbox
                        await db.collection('office_outbox').add({
                            id: `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            workspaceId,
                            officeId: officeType,
                            workItemId: item.id,
                            decision: 'WORK_COMPLETED',
                            reason: `Executed core Office routines. Successfully resolved work item ${item.id}.`,
                            executionTime,
                            cost: 0.0001,
                            tokens: 250,
                            confidence: 95,
                            publishedEvents: [`${officeType}_WORK_COMPLETED`],
                            createdAt: new Date().toISOString()
                        });

                        // Store to shortTerm memory
                        await db.collection('office_memory').add({
                            id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            workspaceId,
                            officeId: officeType,
                            type: 'SHORT',
                            key: `work-${item.id}`,
                            content: {
                                workItemId: item.id,
                                duration: executionTime,
                                success: true,
                                completedAt: new Date().toISOString()
                            },
                            createdAt: new Date().toISOString()
                        });

                        // Update Objectives / KPIs (Simulated metrics increment)
                        try {
                            const runtimeRef = db.collection('office_runtimes').doc(`${workspaceId}_${officeType}`);
                            await runtimeRef.update({
                                'performanceScore.workCompleted': FieldValue.increment(1),
                                'performanceScore.workReceived': FieldValue.increment(1)
                            });
                        } catch (kpiErr) {
                            console.error('[OfficeRuntimeService] Failed to update performanceScore:', kpiErr);
                        }

                        // Publish finished event to EventBus
                        await EventBus.publish(`${officeType}_WORK_COMPLETED`, {
                            workItemId: item.id,
                            workspaceId,
                            officeId: officeType
                        }, 'OFFICE_RUNTIME_SERVICE', workspaceId);

                    } else {
                        targetState = 'FAILED';
                        await doc.ref.update({ state: 'FAILED', finishedAt: new Date().toISOString(), error: errorMsg });

                        await db.collection('office_outbox').add({
                            id: `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            workspaceId,
                            officeId: officeType,
                            workItemId: item.id,
                            decision: 'WORK_FAILED',
                            reason: `Execution failed: ${errorMsg}`,
                            executionTime,
                            cost: 0,
                            tokens: 0,
                            confidence: 0,
                            publishedEvents: [`${officeType}_WORK_FAILED`],
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            } else if (originalState === 'BLOCKED') {
                targetState = 'ESCALATED';
                targetPriority = 'HIGH';
                
                await doc.ref.update({ state: targetState, priority: targetPriority });
                
                await db.collection('office_outbox').add({
                    id: `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    workspaceId,
                    officeId: officeType,
                    workItemId: item.id,
                    decision: 'ESCALATION',
                    reason: `Work item was flagged as BLOCKED. Escalating directly to AI COO.`,
                    executionTime: 0,
                    cost: 0,
                    tokens: 0,
                    confidence: 100,
                    publishedEvents: ['WORK_BLOCKED_ESCALATION'],
                    createdAt: new Date().toISOString()
                });
            }

            updatedInbox.push({
                id: item.id,
                priority: targetPriority,
                sourceEntityId: item.entityId || '',
                sourceEntityType: item.entityType || '',
                description: item.payload?.subject || item.payload?.description || item.eventType || 'Business Workflow Operation',
                status: targetState === 'COMPLETED' ? 'COMPLETED' : 
                        (targetState === 'FAILED' || targetState === 'ESCALATED' ? 'ESCALATED' : 
                         (targetState === 'WORKING' ? 'WORKING' : 
                          (targetState === 'BLOCKED' ? 'BLOCKED' : 'PENDING'))),
                dueAt: item.dueAt || new Date().toISOString()
            });
        }

        await this.updateOfficeState(workspaceId, officeType, 'IDLE');
        return updatedInbox;
    }
}
