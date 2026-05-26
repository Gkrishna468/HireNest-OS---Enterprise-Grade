import { WorkflowRegistry } from '../engine';

export const InterviewCoordinationWorkflow = {
    async executeStep(step: string, state: any, input: any, workflowId: string) {
        switch (step) {
            case 'INITIALIZE':
                return { status: 'CONTINUE_AS_NEW', nextStep: 'COLLECT_AVAILABILITY' };
                
            case 'COLLECT_AVAILABILITY':
                console.log(`[Workflow ${workflowId}] Candidate Selected: Sent availability collector.`);
                return { status: 'AWAIT_SIGNAL', nextStep: 'COORDINATE_CALENDAR' };
                
            case 'COORDINATE_CALENDAR':
                console.log(`[Workflow ${workflowId}] Availability received. Finding slot overlap...`);
                return { status: 'CONTINUE_AS_NEW', nextStep: 'SEND_REMINDERS' };
                
            case 'SEND_REMINDERS':
                console.log(`[Workflow ${workflowId}] Scheduling pre-interview reminders...`);
                return { status: 'AWAIT_SIGNAL', nextStep: 'TRACK_ATTENDANCE' };
                
            case 'TRACK_ATTENDANCE':
                console.log(`[Workflow ${workflowId}] Verifying attendance / video join...`);
                return { status: 'CONTINUE_AS_NEW', nextStep: 'COLLECT_FEEDBACK' };
                
            case 'COLLECT_FEEDBACK':
                console.log(`[Workflow ${workflowId}] Dispatching feedback forms + AI interviewer parser...`);
                return { status: 'AWAIT_SIGNAL', nextStep: 'EVALUATE_FEEDBACK' };
                
            case 'EVALUATE_FEEDBACK':
                console.log(`[Workflow ${workflowId}] Feedback collected. Decision pending.`);
                return { status: 'COMPLETED' };
                
            default:
                throw new Error(`Invalid step: ${step}`);
        }
    }
};

WorkflowRegistry['InterviewCoordination'] = InterviewCoordinationWorkflow;
