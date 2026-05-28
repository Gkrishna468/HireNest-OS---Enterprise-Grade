import { WorkflowInstance, WorkflowState, WorkflowEvent } from "../../types/workflow";

export class SLAMonitor {
    /**
     * Checks if a transition triggered or breached an SLA.
     */
    public validateSLA(workflow: WorkflowInstance, latestEvent: WorkflowEvent): WorkflowInstance {
        // Evaluate SLA rules.
        // Example: If transitioning to INTERVIEW_SCHEDULED, start a 48-hour timer for INTERVIEW_COMPLETED.
        
        let updatedWorkflow = { ...workflow };
        
        // Mark fulfilled timers
        updatedWorkflow.slaTimers = updatedWorkflow.slaTimers.map(timer => {
            if (timer.status === "active" && timer.state === latestEvent.fromState) {
                // If they moved out of the monitored state before deadline, they fulfilled it
                const now = new Date();
                const deadline = new Date(timer.deadlineAt);
                return {
                    ...timer,
                    status: now <= deadline ? "fulfilled" as const : "breached" as const
                };
            }
            return timer;
        });

        return updatedWorkflow;
    }

    /**
     * Checks system periodically for active timers that have expired. 
     */
    public checkTimeouts(workflow: WorkflowInstance): WorkflowInstance {
        let breachedFound = false;
        const now = new Date();

        const timers = workflow.slaTimers.map(timer => {
            if (timer.status === "active" && now > new Date(timer.deadlineAt)) {
                breachedFound = true;
                return { ...timer, status: "breached" as const };
            }
            return timer;
        });

        if (breachedFound) {
            // We would theoretically emit an SLA_BREACHED event here
            // via the event engine
            return {
                ...workflow,
                slaTimers: timers,
            };
        }

        return workflow;
    }
}

export const slaMonitor = new SLAMonitor();
