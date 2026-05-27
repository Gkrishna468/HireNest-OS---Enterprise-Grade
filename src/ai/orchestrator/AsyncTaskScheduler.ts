import { z } from 'zod';
import { aiOrchestrator } from './AgentOrchestrator';

/**
 * Very foundational interface for Async Tasks (aligning with MCP / Enterprise Patterns).
 * Long-term, this could be backed by Google Cloud Tasks, Temporal, or an internal Firestore queue.
 */
export interface OrchestratorTask {
  id: string;
  skillId: string;
  payload: any;
  context: any;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  createdAt: number;
  retries: number;
  maxRetries: number;
  idempotencyKey: string;
}

export class AsyncTaskScheduler {
  private queue: OrchestratorTask[] = [];
  private deadLetterQueue: OrchestratorTask[] = [];
  private processedKeys: Set<string> = new Set(); // Idempotency tracker

  /**
   * Enqueues a cognitive skill to be executed completely statelessly and asynchronously.
   * Includes idempotency protection to prevent duplicate execution of the same workflow.
   */
  async submitTask(skillId: string, payload: unknown, context: any, options?: { maxRetries?: number, idempotencyKey?: string }): Promise<string> {
    const idempotencyKey = options?.idempotencyKey || `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Idempotency check: Ignore duplicate submissions
    if (this.processedKeys.has(idempotencyKey)) {
      console.log(`[Scheduler] Idempotency key [${idempotencyKey}] already processed. Skipping duplicate task.`);
      return idempotencyKey;
    }
    
    const task: OrchestratorTask = {
      id: idempotencyKey,
      skillId,
      payload,
      context: { ...context, taskId: idempotencyKey, idempotencyKey }, // Inject tracing & idempotency ID
      status: 'PENDING',
      createdAt: Date.now(),
      retries: 0,
      maxRetries: options?.maxRetries ?? 3,
      idempotencyKey
    };
    
    this.processedKeys.add(idempotencyKey);
    this.queue.push(task);
    
    console.log(`[Scheduler] Queued Task [${task.id}] for Skill [${skillId}]`);
    
    // Abstracting underlying storage/execution (e.g., Temporal / Cloud Tasks callback)
    this.simulateBackgroundWorker(task.id);

    return task.id;
  }

  private async simulateBackgroundWorker(taskId: string) {
    // 1. Fetch task
    const taskIndex = this.queue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = this.queue[taskIndex];
    task.status = 'IN_PROGRESS';
    
    console.log(`[Worker] Starting Task [${taskId}] executing [${task.skillId}] - Attempt ${task.retries + 1}`);
    const result = await aiOrchestrator.executeSkill(task.skillId, task.payload, task.context);
    
    if (result.success) {
        task.status = 'COMPLETED';
        console.log(`[Worker] Task [${taskId}] Completed Succesfully.`);
        // Persist artifacts...
    } else {
        task.retries += 1;
        if (task.retries < task.maxRetries) {
            task.status = 'RETRYING';
            console.log(`[Worker] Task [${taskId}] Failed. Retrying (${task.retries}/${task.maxRetries})...`);
            // Exponential backoff logic would go here
            setTimeout(() => this.simulateBackgroundWorker(taskId), 1000 * Math.pow(2, task.retries));
        } else {
            task.status = 'FAILED';
            console.error(`[Worker] Task [${taskId}] Exhausted retries. Moving to Dead Letter Queue.`);
            
            // Remove from active queue and push to DLQ
            this.queue.splice(taskIndex, 1);
            this.deadLetterQueue.push(task);
            
            // Persist absolute failure state
        }
    }
  }
}

export const asyncTaskScheduler = new AsyncTaskScheduler();
