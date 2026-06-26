import express from 'express';
import { db } from '../../lib/firebase-admin.js';
import { MailOSService } from '../services/MailOSService.js';
import { AgentOrchestrator } from '../services/AgentOrchestrator.js';

const cronHandler = express.Router();

cronHandler.get('/orchestrator/reset', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");
        const snapshot = await db.collection('ai_agents').get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        res.json({ success: true, message: 'Agents collection reset' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.get('/orchestrator/seed', async (req, res) => {
    try {
        await AgentOrchestrator.seedCoreAgents();
        res.json({ success: true, message: 'Core agents seeded' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.post('/orchestrator/enqueue', async (req, res) => {
    try {
        const { agentId } = req.body;
        const jobId = await AgentOrchestrator.enqueueJob(agentId, { triggeredBy: 'Manual Run', timestamp: new Date().toISOString() });
        res.json({ success: true, jobId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.get('/orchestrator/process', async (req, res) => {
    try {
        await AgentOrchestrator.processQueue();
        res.json({ success: true, message: 'Queue processed' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// OS Engine Endpoints
import { EnterpriseScheduler } from '../services/EnterpriseScheduler.js';
import { ContinuousMatchingEngine } from '../services/ContinuousMatchingEngine.js';
import { ContinuousImprovementEngine } from '../services/ContinuousImprovementEngine.js';
import { NetworkOpportunityEngine } from '../services/NetworkOpportunityEngine.js';
import { AICOO } from '../services/AICOO.js';

cronHandler.get('/os/enterprise-scheduler', async (req, res) => {
    try {
        await EnterpriseScheduler.triggerScheduledRoutines();
        res.json({ success: true, message: 'Enterprise Scheduler triggered routines' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.get('/os/continuous-matching', async (req, res) => {
    try {
        const result = await ContinuousMatchingEngine.executeNetworkMatchCycle();
        res.json({ success: true, result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.get('/os/continuous-improvement', async (req, res) => {
    try {
        const workspaceId = req.query.workspaceId as string || 'default-workspace';
        const result = await ContinuousImprovementEngine.executeNightlyAnalysis(workspaceId);
        res.json({ success: true, result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.get('/os/network-opportunities', async (req, res) => {
    try {
        const result = await NetworkOpportunityEngine.searchForOpportunities();
        res.json({ success: true, result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.get('/os/coo-review', async (req, res) => {
    try {
        const workspaceId = req.query.workspaceId as string || 'default-workspace';
        const result = await AICOO.reviewEnterpriseQueues(workspaceId);
        res.json({ success: true, result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

cronHandler.get('/mailos-sync', async (req, res) => {
    // In production, verify cron auth token here
    // const authHeader = req.headers.authorization;
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    if (!db) {
        return res.status(500).json({ error: "Database not initialized" });
    }

    try {
        console.log("[CRON] Starting MailOS Sync across workspaces");
        const connectionsSnap = await db.collection('workspace_connections').where('gmail', '==', true).get();
        
        const results = [];
        for (const doc of connectionsSnap.docs) {
            const uid = doc.id;
            // Fetch user's orgId
            const userDoc = await db.collection('users').doc(uid).get();
            const orgId = userDoc.data()?.organizationId || userDoc.data()?.orgId;
            
            if (orgId) {
                try {
                    const processed = await MailOSService.syncInbox(uid, orgId);
                    results.push({ uid, orgId, processed });
                    
                    // Log execution metrics for Executive Dashboard
                    if (processed.length > 0) {
                        await db.collection('mailos_executions').add({
                            uid,
                            orgId,
                            timestamp: new Date().toISOString(),
                            processedCount: processed.length,
                            details: processed
                        });
                    }
                } catch (e: any) {
                    console.error(`[CRON] Failed to sync inbox for user ${uid}:`, e.message);
                    results.push({ uid, orgId, error: e.message });
                }
            }
        }

        res.json({ success: true, executions: results.length, details: results });
    } catch (e: any) {
        console.error("[CRON] MailOS Sync failed:", e);
        res.status(500).json({ error: e.message });
    }
});

export default cronHandler;
