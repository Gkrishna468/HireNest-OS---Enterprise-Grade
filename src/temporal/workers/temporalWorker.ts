import { TemporalContext } from '../config/temporalConfig';
import { DeadLetterQueue } from '../../recovery/DeadLetterQueue';

export type WorkflowFn = (context: TemporalContext, ...args: any[]) => Promise<any>;

/**
 * Generic Temporal Worker Wrapper
 * Abstracts exponential backoff and DLQ routing.
 */
export class TemporalWorker {
  constructor(public queueName: string, private maxRetries = 3) {}

  async executeWithRetry(
    eventType: string, 
    workflow: WorkflowFn, 
    context: TemporalContext, 
    ...args: any[]
  ): Promise<any> {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        console.log(`[TemporalWorker|${this.queueName}] Executing ${eventType} (Attempt ${attempt + 1}/${this.maxRetries + 1})`);
        const result = await workflow(context, ...args);
        return result;
      } catch (error: any) {
        console.error(`[TemporalWorker|${this.queueName}] Failure executing ${eventType}: ${error.message}`);
        attempt++;
        
        if (attempt > this.maxRetries) {
          // Route to DLQ
          await DeadLetterQueue.routeToDLQ(context, eventType, error, args, attempt);
          throw new Error(`Exhausted retries for ${eventType}. Routed to DLQ.`);
        }
        
        // Exponential backoff stub
        await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
      }
    }
  }
}
