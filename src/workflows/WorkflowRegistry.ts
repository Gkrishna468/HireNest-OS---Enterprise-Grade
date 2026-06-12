import { IWorkflow } from './types/IWorkflow';
import { WorkflowContext } from './types/WorkflowContext';
import { WorkflowResult } from './types/WorkflowResult';
import { WorkflowStatus } from './types/WorkflowStatus';

export class WorkflowRegistry {
  private static instance: WorkflowRegistry;
  private workflows: Map<string, IWorkflow[]> = new Map(); // EventType -> Workflows

  private constructor() {}

  public static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance) {
      WorkflowRegistry.instance = new WorkflowRegistry();
    }
    return WorkflowRegistry.instance;
  }

  public register(triggerEvent: string, workflow: IWorkflow): void {
    if (!this.workflows.has(triggerEvent)) {
      this.workflows.set(triggerEvent, []);
    }
    this.workflows.get(triggerEvent)!.push(workflow);
    console.log(`[WorkflowRegistry] Registered ${workflow.name} to ${triggerEvent}`);
  }

  public async dispatch(context: WorkflowContext): Promise<WorkflowResult[]> {
    const trigger = context.triggerEvent;
    const mappedWorkflows = this.workflows.get(trigger);

    if (!mappedWorkflows || mappedWorkflows.length === 0) {
      console.log(`[WorkflowRegistry] No workflows registered for event: ${trigger}`);
      return [];
    }

    console.log(`[WorkflowRegistry] Dispatching ${mappedWorkflows.length} workflows for ${trigger}`);

    const results: WorkflowResult[] = [];

    for (const wf of mappedWorkflows) {
      try {
        console.log(`[WorkflowRegistry] Executing workflow: ${wf.name} (ID: ${context.workflowId})`);
        const result = await wf.execute(context);
        results.push(result);
      } catch (err: any) {
        console.error(`[WorkflowRegistry] Workflow execution failed: ${wf.name}`, err);
        
        // Execute compensation
        try {
           const compResult = await wf.compensate(context, err);
           results.push(compResult);
        } catch(compErr: any) {
           console.error(`[WorkflowRegistry] Compensation failed for: ${wf.name}`, compErr);
           results.push({
             workflowId: context.workflowId,
             status: WorkflowStatus.FAILED,
             error: err,
             completedAt: new Date()
           });
        }
      }
    }

    return results;
  }
}
