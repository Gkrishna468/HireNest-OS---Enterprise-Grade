import { db } from '../../lib/firebase-admin';

export interface AgentJob {
  id?: string;
  agentName: string;
  payload: any;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRY';
  retries: number;
  maxRetries: number;
  scheduledFor: Date;
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number;
  errors?: string[];
}

export class AgentRuntimeService {
  static async enqueueJob(agentName: string, payload: any, delayMs: number = 0, maxRetries: number = 3) {
    if (!db) throw new Error("DB not initialized");
    const job: AgentJob = {
      agentName,
      payload,
      status: 'PENDING',
      retries: 0,
      maxRetries,
      scheduledFor: new Date(Date.now() + delayMs),
    };
    
    const docRef = await db.collection('agent_queue').add(job);
    return docRef.id;
  }

  static async processQueue() {
    if (!db) throw new Error("DB not initialized");
    
    // Find pending jobs that are due
    const now = new Date();
    const snap = await db.collection('agent_queue')
      .where('status', 'in', ['PENDING', 'RETRY'])
      .where('scheduledFor', '<=', now)
      .limit(10)
      .get();
      
    if (snap.empty) return { processed: 0 };
    
    let processed = 0;
    for (const doc of snap.docs) {
      const job = doc.data() as AgentJob;
      await doc.ref.update({ status: 'RUNNING', startedAt: new Date() });
      
      const startTime = Date.now();
      try {
        // Execute the agent based on name
        await this.executeAgent(job.agentName, job.payload);
        
        const duration = Date.now() - startTime;
        
        // Write to history
        await db.collection('agent_executions').add({
          agent: job.agentName,
          status: 'Completed',
          startedAt: job.startedAt || new Date(),
          finishedAt: new Date(),
          duration,
          recordsProcessed: 1, // Mocked for now
          errors: 0
        });
        
        // Remove from queue
        await doc.ref.delete();
        processed++;
      } catch (e: any) {
        const duration = Date.now() - startTime;
        const newRetries = (job.retries || 0) + 1;
        
        if (newRetries >= (job.maxRetries || 3)) {
          // Dead letter queue
          await db.collection('agent_dlq').add({
            ...job,
            error: e.message,
            failedAt: new Date()
          });
          await doc.ref.delete();
          
          await db.collection('agent_executions').add({
            agent: job.agentName,
            status: 'Failed',
            startedAt: job.startedAt || new Date(),
            finishedAt: new Date(),
            duration,
            recordsProcessed: 0,
            errors: 1,
            errorDetails: e.message
          });
        } else {
          // Retry
          await doc.ref.update({
            status: 'RETRY',
            retries: newRetries,
            errors: [...(job.errors || []), e.message],
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000) // retry in 5 mins
          });
        }
      }
    }
    
    return { processed };
  }
  
  static async executeAgent(agentName: string, payload: any) {
    // This is the router where different AI agents are triggered
    console.log(`[AgentRuntime] Executing ${agentName} with payload`, payload);
    
    switch (agentName) {
      case 'Resume Parser':
        // Await logic
        break;
      case 'Mail Sync':
        // Await logic
        break;
      case 'Requirement Extraction Agent':
        // Await logic
        break;
      case 'Vendor Broadcast':
        // Await logic
        break;
      case 'Matching Engine':
        // Await logic
        break;
      default:
        throw new Error(`Unknown agent type: ${agentName}`);
    }
  }
  
  static async scheduleEvent(eventName: string, payload: any) {
     console.log(`[EventBus] Received event: ${eventName}`, payload);
     
     // Route events to specific agents
     switch(eventName) {
        case 'EMAIL_RECEIVED':
           await this.enqueueJob('Mail Sync', payload);
           break;
        case 'REQUIREMENT_CREATED':
           await this.enqueueJob('Matching Engine', payload);
           await this.enqueueJob('Vendor Broadcast', payload, 5000); // 5 sec delay
           break;
        case 'RESUME_UPLOADED':
           await this.enqueueJob('Resume Parser', payload);
           break;
        case 'MATCH_COMPLETED':
           break;
     }
  }
}
