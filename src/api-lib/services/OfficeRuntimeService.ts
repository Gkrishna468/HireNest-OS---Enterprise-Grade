import { db } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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
 * The OfficeRuntimeService replaces static CRUD controllers.
 * It manages the runtime state, memory, and inbox of an AI Office (e.g., Recruitment, Vendor).
 */
export class OfficeRuntimeService {
    
    static async getOfficeRuntime(workspaceId: string, officeType: string): Promise<OfficeRuntime | null> {
        if (!db) return null;
        
        const runtimeRef = db.collection('office_runtimes').doc(`${workspaceId}_${officeType}`);
        const runtimeDoc = await runtimeRef.get();
        
        if (!runtimeDoc.exists) {
            // Seed a new runtime
            const newRuntime: OfficeRuntime = {
                officeId: `${workspaceId}_${officeType}`,
                managerName: `${officeType} Manager AI`,
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
                },
                inbox: [],
                memory: {
                    shortTerm: [],
                    working: [],
                    longTerm: { fillRate: 0, slaAverage: 0 },
                    knowledge: []
                },
                outbox: []
            };
            await runtimeRef.set(newRuntime);
            return newRuntime;
        }
        
        return runtimeDoc.data() as OfficeRuntime;
    }
    
    static async appendToInbox(workspaceId: string, officeType: string, item: Omit<OfficeInboxItem, 'id' | 'status'>) {
        if (!db) return;
        const runtimeRef = db.collection('office_runtimes').doc(`${workspaceId}_${officeType}`);
        
        const newItem = {
            ...item,
            id: `inbox_${Date.now()}`,
            status: 'PENDING'
        };
        
        await runtimeRef.update({
            // Using a simple array append for the prototype. In prod this would be a subcollection.
            inbox: FieldValue.arrayUnion(newItem),
            state: 'RECEIVING_WORK'
        });
    }

    static async updateOfficeState(workspaceId: string, officeType: string, state: OfficeState) {
        if (!db) return;
        const runtimeRef = db.collection('office_runtimes').doc(`${workspaceId}_${officeType}`);
        await runtimeRef.update({ state });
    }

    /**
     * Executes the Office Manager routine.
     * The Manager reviews the inbox, prioritizes work, assigns tasks, escalates blocked items, and updates KPIs.
     */
    static async executeManagerRoutine(workspaceId: string, officeType: string) {
        if (!db) return;
        
        console.log(`[OfficeRuntimeService] Executing Manager Routine for ${officeType} Office in ${workspaceId}`);
        await this.updateOfficeState(workspaceId, officeType, 'PRIORITIZING');
        
        const runtime = await this.getOfficeRuntime(workspaceId, officeType);
        if (!runtime) return;
        
        let hasChanges = false;
        const now = new Date();
        
        const updatedInbox = runtime.inbox.map(item => {
            if (item.status === 'PENDING') {
                const dueDate = new Date(item.dueAt);
                // Escalate if past due
                if (dueDate < now) {
                    item.status = 'ESCALATED';
                    item.priority = 'HIGH';
                    hasChanges = true;
                } else {
                    item.status = 'WORKING';
                    hasChanges = true;
                    // Enqueue task for execution based on sourceEntityType
                    // (e.g., AgentOrchestrator.enqueueJob)
                }
            } else if (item.status === 'BLOCKED') {
                // If blocked for more than a day, escalate
                // For simplicity, just escalate immediately in this stub
                item.status = 'ESCALATED';
                hasChanges = true;
            }
            return item;
        });
        
        if (hasChanges) {
            const runtimeRef = db.collection('office_runtimes').doc(`${workspaceId}_${officeType}`);
            await runtimeRef.update({
                inbox: updatedInbox,
                state: 'EXECUTING'
            });
        } else {
            await this.updateOfficeState(workspaceId, officeType, 'IDLE');
        }
        
        return updatedInbox;
    }
}
