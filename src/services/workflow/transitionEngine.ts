import { 
  RequirementState, 
  SubmissionState, 
  OnboardingState, 
  WorkflowEvent, 
  WorkflowInstance, 
  WorkflowType, 
  WorkflowState 
} from "../../types/workflow";
import { v4 as uuidv4 } from "uuid";

/**
 * Validates determinist transitions for Submissions.
 * Centralizing state logic here prevents UI-driven state chaos.
 */
function isValidSubmissionTransition(from: SubmissionState, to: SubmissionState): boolean {
  // Simple valid path mapping (Expand as needed according to business rules)
  const validTransitions: Record<SubmissionState, SubmissionState[]> = {
    [SubmissionState.CREATED]: [SubmissionState.SUBMITTED],
    [SubmissionState.SUBMITTED]: [SubmissionState.UNDER_REVIEW, SubmissionState.REJECTED],
    [SubmissionState.UNDER_REVIEW]: [SubmissionState.SHORTLISTED, SubmissionState.REJECTED],
    [SubmissionState.SHORTLISTED]: [SubmissionState.INTERVIEW_SCHEDULED, SubmissionState.REJECTED],
    [SubmissionState.INTERVIEW_SCHEDULED]: [SubmissionState.INTERVIEW_COMPLETED, SubmissionState.DROPPED],
    [SubmissionState.INTERVIEW_COMPLETED]: [SubmissionState.OFFERED, SubmissionState.REJECTED],
    [SubmissionState.OFFERED]: [SubmissionState.ACCEPTED, SubmissionState.DECLINED],
    [SubmissionState.ACCEPTED]: [SubmissionState.JOINED, SubmissionState.DROPPED],
    [SubmissionState.JOINED]: [],
    [SubmissionState.DECLINED]: [],
    [SubmissionState.REJECTED]: [],
    [SubmissionState.DROPPED]: []
  };

  return validTransitions[from]?.includes(to) ?? false;
}

// Implement similar logic for Requirement and Onboarding...
function isValidRequirementTransition(from: RequirementState, to: RequirementState): boolean {
  return true; // Placeholder for full state machine logic
}

export class TransitionEngine {
  
  /**
   * Evaluates if a state transition is legal in the current workflow.
   */
  public canTransition(
    workflow: WorkflowInstance, 
    targetState: WorkflowState, 
    actorId: string, 
    actorRole: string
  ): boolean {
    
    // 1. Valid state edge check for Submission
    if (workflow.workflowType === "submission_lifecycle") {
        if (!isValidSubmissionTransition(workflow.currentState as SubmissionState, targetState as SubmissionState)) {
             console.warn(`Invalid edge from ${workflow.currentState} to ${targetState}`);
             return false;
        }

        // ROLE-BASED TRANSITION MATRIX for Submissions
        // For enterprise governance: certain roles only
        if (targetState === SubmissionState.OFFERED && !actorRole.includes('client')) {
             console.warn(`Only client can move to OFFERED`);
             return false;
        }

        if (targetState === SubmissionState.JOINED && actorRole.includes('vendor')) {
             const isAdmin = actorRole.includes('admin');
             const isVendor = actorRole.includes('vendor');
             if (isVendor && !isAdmin) {
                 // Even if vendor knows they joined, they shouldn't mark it, client or ops admin must
                 console.warn(`Vendor cannot mark JOINED state.`);
                 return false;
             }
        }
    }
    
    return true;
  }

  public executeTransition(
    workflow: WorkflowInstance,
    targetState: WorkflowState,
    actorId: string,
    organizationId: string,
    actorRole: string,
    metadata: any = {}
  ): { nextWorkflow: WorkflowInstance, event: WorkflowEvent } {
    
    if (metadata.initialization) {
         // Skip role checks for initial gen
    } else if (!this.canTransition(workflow, targetState, actorId, actorRole)) {
        throw new Error(`Invalid state transition from ${workflow.currentState} to ${targetState} by role ${actorRole}`);
    }

    const event: WorkflowEvent = {
        eventId: `evt_${uuidv4()}`,
        workflowId: workflow.workflowId,
        workflowType: workflow.workflowType,
        eventType: `${workflow.workflowType.toUpperCase()}_TRANSITION`, 
        fromState: workflow.currentState,
        toState: targetState,
        actorId,
        organizationId,
        timestamp: new Date().toISOString(),
        metadata,
    };

    const nextWorkflow: WorkflowInstance = {
        ...workflow,
        currentState: targetState,
        history: [...workflow.history, event],
        updatedAt: new Date().toISOString()
    };

    return { nextWorkflow, event };
  }
}

export const transitionEngine = new TransitionEngine();
