import { WorkflowEvent, WorkflowInstance } from "../../types/workflow";
import { db } from "../../lib/firebase";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Handles the actual persistence and broadcast of workflow events.
 * This is where Side Effects happen (e.g. updating Analytics, triggering notifications)
 */
export class EventEmitter {
    
    /**
     * Commits a state transition and logs the audit event.
     */
    public async commitTransition(
        workflow: WorkflowInstance, 
        event: WorkflowEvent,
        entityCollection: string
    ): Promise<void> {
        
        // 1. Update the canonical entity state (e.g. Requirement, Submission)
        const entityRef = doc(db, entityCollection, workflow.entityId);
        await updateDoc(entityRef, {
             status: event.toState,
             updatedAt: new Date().toISOString()
        });

        // 2. We can also persist the WorkflowInstance graph to a tracking collection
        // if we want full replayability, separate from the primary entity.
        const workflowRef = doc(db, "workflow_instances", workflow.workflowId);
        await setDoc(workflowRef, workflow, { merge: true });

        // 3. Write Immutable Event to Audit Log
        const eventRef = doc(db, "workflow_events", event.eventId);
        await setDoc(eventRef, event);

        // 4. Trigger asynchronous side-effects (e.g., Cloud Functions, notifications)
        this.emitSubscribers(event);
    }

    private emitSubscribers(event: WorkflowEvent) {
         // In a real system, this might push to PubSub, Eventarc, or just call local handlers
         console.log(`[Workflow Engine] Emitted Event: ${event.eventType} on Workflow: ${event.workflowId}`);
    }
}

export const eventEmitter = new EventEmitter();
