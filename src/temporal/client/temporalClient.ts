import { TemporalConfig, TemporalContext } from '../config/temporalConfig';

/**
 * Interface representing our internal Temporal Client Wrapper.
 * This encapsulates the underlying workflow starting logic and allows
 * for easy mocking / trace injection.
 */
export class TemporalClient {
  private static instance: TemporalClient;

  private constructor() {}

  public static getInstance(): TemporalClient {
    if (!TemporalClient.instance) {
      TemporalClient.instance = new TemporalClient();
    }
    return TemporalClient.instance;
  }

  /**
   * Starts a workflow execution asynchronously.
   */
  public async startWorkflow(workflowType: string, args: any[], context: TemporalContext, taskQueue: string = TemporalConfig.taskQueues.DEFAULT): Promise<string> {
    console.log(`[TemporalClient] Starting workflow ${workflowType} on queue ${taskQueue}...`, {
      traceId: context.traceId,
      workflowId: context.workflowId
    });
    
    // In a full implementation, this bridges to @temporalio/client
    // const handle = await client.workflow.start(workflowType, { args, taskQueue, workflowId: context.workflowId });
    // return handle.workflowId;

    return context.workflowId || `wf-dev-${Date.now()}`;
  }

  /**
   * Sends a signal to a running workflow.
   */
  public async signalWorkflow(workflowId: string, signalName: string, payload: any): Promise<void> {
    console.log(`[TemporalClient] Signaling workflow ${workflowId} with signal ${signalName}`);
    // client.workflow.getHandle(workflowId).signal(signalName, payload);
  }

  /**
   * Cancels a running workflow.
   */
  public async cancelWorkflow(workflowId: string): Promise<void> {
    console.log(`[TemporalClient] Cancelling workflow ${workflowId}`);
    // client.workflow.getHandle(workflowId).cancel();
  }
}

export const temporalClient = TemporalClient.getInstance();
