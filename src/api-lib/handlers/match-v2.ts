import { MatchingEngineV2 } from '../services/MatchingEngineV2.js';
import { db } from '../../lib/firebase-admin.js';

export default async function matchV2Handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { requirementId, candidateId } = req.body;
    const orgId = req.user?.orgId || req.query?.orgId || 'system';

    if (!requirementId || !candidateId) {
        return res.status(400).json({ error: 'Missing requirementId or candidateId' });
    }

    try {
        let requirement = null;
        let candidate = null;

        if (db) {
            const reqDoc = await db.collection('requirements').doc(requirementId).get();
            if (reqDoc.exists) requirement = { id: reqDoc.id, ...reqDoc.data() };

            const candDoc = await db.collection('candidates').doc(candidateId).get();
            if (candDoc.exists) candidate = { id: candDoc.id, ...candDoc.data() };
        }

        if (!requirement || !candidate) {
            // Fallback for testing if DB is not populated
            requirement = req.body.requirement || { id: requirementId, skills: ['React', 'Node'], title: 'Fullstack Dev' };
            candidate = req.body.candidate || { id: candidateId, skills: ['React'], name: 'Test Candidate' };
        }

        const matchResult = await MatchingEngineV2.generateMatch(requirement, candidate, orgId);

        return res.status(200).json({ success: true, data: matchResult });
    } catch (e: any) {
        console.error("V2 Match error", e);
        return res.status(500).json({ error: 'Failed to generate match', details: e.message });
    }
}
