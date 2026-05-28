// src/services/workflow/workflowOrchestrator.ts

import { WorkflowState, WorkflowInstance, WorkflowType } from "../../types/workflow";
import { transitionEngine } from "./transitionEngine";
import { slaMonitor } from "./slaMonitor";
import { eventEmitter } from "./eventEmitter";
import { v4 as uuidv4 } from "uuid";

export class WorkflowOrchestrator {
    
    /**
     * Attempts to transition a workflow to a new state.
     * Guaranteed to be deterministic.
     */
    public async transitionTo(
        workflow: WorkflowInstance,
        targetState: WorkflowState,
        actorId: string,
        actorRole: string,
        organizationId: string,
        entityCollection: string, // e.g. "submissions" or "requirements_public"
        metadata: any = {}
    ): Promise<WorkflowInstance> {
        
        // 1. Calculate Transition & Generate Immutable Event
        const { nextWorkflow, event } = transitionEngine.executeTransition(
            workflow, 
            targetState, 
            actorId, 
            organizationId, 
            actorRole,
            metadata
        );

        // 2. Evaluate SLA Impacts (Timers closed/started)
        const slaAwareWorkflow = slaMonitor.validateSLA(nextWorkflow, event);

        // 3. Commit to Operational Graph (Firestore)
        await eventEmitter.commitTransition(slaAwareWorkflow, event, entityCollection);

        return slaAwareWorkflow;
    }

    public async initializeWorkflow(
        workflowType: WorkflowType,
        entityId: string,
        initialState: WorkflowState,
        ownerOrgId: string,
        actorId: string,
        actorRole: string,
        entityCollection: string
    ): Promise<WorkflowInstance> {
        const workflowId = `wf_${uuidv4()}`;
        const newWorkflow: WorkflowInstance = {
            workflowId,
            workflowType,
            entityId,
            currentState: initialState,
            history: [],
            ownerOrgId,
            responsibleUsers: [actorId],
            visibilityScopes: [], // Add default scopes
            participantOrganizations: [ownerOrgId],
            slaTimers: [],
            riskFlags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const { nextWorkflow, event } = transitionEngine.executeTransition(
            newWorkflow,
            initialState,
            actorId,
            ownerOrgId,
            actorRole,
            { initialization: true }
        );

        await eventEmitter.commitTransition(nextWorkflow, event, entityCollection);
        return nextWorkflow;
    }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
