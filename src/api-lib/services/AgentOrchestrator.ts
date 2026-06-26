import { db } from '../../lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

export interface AgentJob {
    jobId: string;
    agentId: string;
    event: any;
    priority: 'high' | 'medium' | 'low';
    attempts: number;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
    runtime?: number;
    orgId?: string;
}

export class AgentOrchestrator {
    
    // Core Seed - creates the necessary agents if they don't exist
    static async seedCoreAgents() {
        if (!db) return;
        
        const coreAgents = [
            { id: 'resume-parser', name: 'Resume Parser', category: 'Recruitment Office', triggerType: 'EVENT', triggerEvent: 'RESUME_UPLOADED', schedule: 'On Resume Uploaded', status: 'Healthy', enabled: true },
            { id: 'matching-engine', name: 'Matching Engine', category: 'Recruitment Office', triggerType: 'EVENT', triggerEvent: 'REQUIREMENT_CREATED', schedule: 'On Requirement Created', status: 'Healthy', enabled: true },
            { id: 'vendor-broadcast', name: 'Vendor Broadcast', category: 'Recruitment Office', triggerType: 'EVENT', triggerEvent: 'REQUIREMENT_CREATED', schedule: 'On Requirement Created', status: 'Healthy', enabled: true },
            { id: 'lead-discovery', name: 'Lead Discovery', category: 'GTM Office', triggerType: 'CRON', schedule: 'Hourly', status: 'Healthy', enabled: true },
            { id: 'mailos-agent', name: 'MailOS Agent', category: 'Platform Office', triggerType: 'CRON', schedule: 'Every 5 min', status: 'Healthy', enabled: true },
            { id: 'audit-logger', name: 'Audit Agent', category: 'Security Office', triggerType: 'EVENT', triggerEvent: 'ANY_EVENT', schedule: 'Event-driven', status: 'Healthy', enabled: true },
        ];
        
        for (const agent of coreAgents) {
            const docRef = db.collection('ai_agents').doc(agent.id);
            const doc = await docRef.get();
            if (!doc.exists) {
                await docRef.set({
                    ...agent,
                    successRate: 100,
                    avgRuntime: 0,
                    execsToday: 0,
                    failureCount: 0,
                    lastRun: new Date().toISOString()
                });
            }
        }
    }

    // Push an event to the queue
    static async enqueueJob(agentId: string, eventPayload: any, priority: 'high' | 'medium' | 'low' = 'medium', orgId?: string) {
        if (!db) return;
        
        const job: AgentJob = {
            jobId: `job-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            agentId,
            event: eventPayload,
            priority,
            attempts: 0,
            status: 'queued',
            createdAt: new Date().toISOString(),
            orgId
        };
        
        await db.collection('agent_queue').doc(job.jobId).set(job);
        
        // Also update the agent's status to Busy if we want real-time metrics, but wait for processing
        return job.jobId;
    }

    // A simple mock for executing different agent types
    static async executeAgentLogic(agentId: string, payload: any): Promise<{ success: boolean; output: any; tokens?: number; model?: string; error?: string }> {
        // Simulate execution time
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
        
        if (agentId === 'resume-parser') {
            return { success: true, output: { status: 'parsed', name: 'Extracted Name' }, tokens: 1250, model: 'gemini-1.5-pro' };
        }
        
        return { success: true, output: { status: 'processed' }, tokens: 450, model: 'gemini-1.5-flash' };
    }

    // Process the queue
    static async processQueue() {
        if (!db) return;
        
        // Get up to 5 queued jobs
        const snapshot = await db.collection('agent_queue')
            .where('status', '==', 'queued')
            .orderBy('createdAt', 'asc')
            .limit(5)
            .get();
            
        if (snapshot.empty) return;
        
        for (const doc of snapshot.docs) {
            const job = doc.data() as AgentJob;
            
            // Mark as processing
            await doc.ref.update({ status: 'processing', startedAt: new Date().toISOString() });
            
            // Update agent status to Busy
            await db.collection('ai_agents').doc(job.agentId).update({ status: 'Busy' }).catch(() => {});
            
            const start = Date.now();
            
            try {
                const result = await this.executeAgentLogic(job.agentId, job.event);
                const duration = Date.now() - start;
                
                // Mark job as completed
                await doc.ref.update({ 
                    status: 'completed', 
                    finishedAt: new Date().toISOString(),
                    runtime: duration 
                });
                
                // Record execution history
                await db.collection('agent_executions').add({
                    jobId: job.jobId,
                    agentId: job.agentId,
                    orgId: job.orgId || null,
                    inputs: job.event,
                    outputs: result.output,
                    duration,
                    tokens: result.tokens || 0,
                    model: result.model || 'unknown',
                    status: 'success',
                    timestamp: new Date().toISOString()
                });
                
                // Update agent stats
                await db.collection('ai_agents').doc(job.agentId).update({
                    status: 'Healthy',
                    lastRun: new Date().toISOString(),
                    // Increment execs Today would require a transaction, but we'll simplify here or do it in the UI
                });
                
            } catch (e: any) {
                const duration = Date.now() - start;
                // Mark job as failed
                await doc.ref.update({ 
                    status: 'failed', 
                    finishedAt: new Date().toISOString(),
                    runtime: duration,
                    error: e.message 
                });
                
                // Record execution history
                await db.collection('agent_executions').add({
                    jobId: job.jobId,
                    agentId: job.agentId,
                    orgId: job.orgId || null,
                    inputs: job.event,
                    error: e.message,
                    duration,
                    status: 'error',
                    timestamp: new Date().toISOString()
                });
                
                // Update agent stats
                await db.collection('ai_agents').doc(job.agentId).update({
                    status: 'Healthy', // or Degraded
                    failureCount: FieldValue.increment(1)
                });
            }
        }
    }
}
