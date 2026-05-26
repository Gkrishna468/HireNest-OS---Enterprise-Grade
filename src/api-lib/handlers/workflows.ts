import { temporal } from '../temporal/engine';
import '../temporal/workflows/candidate-lifecycle';
import '../temporal/workflows/vendor-governance';
import '../temporal/workflows/ai-copilot';
import '../temporal/workflows/sla-escalation';
import '../temporal/workflows/interview-coordination';
import { adminDb } from '../../lib/firebase-admin';

export default async function workflowsHandler(req: any, res: any) {
    if (req.method === 'POST') {
        const { action, workflowType, input, workflowId, signalName, signalData } = req.body;
        
        switch (action) {
            case 'start':
                const newId = await temporal.startWorkflow(workflowType, input);
                return res.json({ success: true, workflowId: newId });
                
            case 'signal':
                await temporal.signalWorkflow(workflowId, signalName, signalData);
                return res.json({ success: true });
                
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } else if (req.method === 'GET') {
        const snapshot = await adminDb.collection('workflows')
                                      .orderBy('updatedAt', 'desc')
                                      .limit(20)
                                      .get();
                                      
        const workflows = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            }
        });
        
        return res.json({ workflows });
    }
}
