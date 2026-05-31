import { adminDb } from '../../lib/firebase-admin.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!adminDb) return res.status(503).json({ success: false, error: "Firebase Service Account configuration is missing. Cannot perform cleanup in client fallback mode." });

  try {
    const { role, reqId } = req.body;
    if (role !== 'adminHQ') {
      return res.status(403).json({ error: 'Only Admin HQ can perform cleanup.' });
    }

    let deletedMatchesCount = 0;

    if (reqId) {
        console.log(`Force purging all ai_matches for requirement: ${reqId}`);
        const allMatchesSnapshot = await adminDb.collectionGroup('ai_matches').get();
        for (const matchDoc of allMatchesSnapshot.docs) {
            if (matchDoc.id === reqId) {
                await matchDoc.ref.delete();
                deletedMatchesCount++;
            }
        }
        return res.status(200).json({ success: true, deletedMatchesCount, message: `Force purged ${deletedMatchesCount} matches for req: ${reqId}` });
    }
    
    // Fetch all candidates by ID to quickly check existence/status
    const candidatesSnapshot = await adminDb.collection('candidatePool').get();
    const candidateMap = new Map();
    candidatesSnapshot.docs.forEach(doc => {
        candidateMap.set(doc.id, doc.data());
    });

    // Fetch all requirements
    const reqsSnapshot = await adminDb.collection('requirements_public').get();
    const reqMap = new Map();
    reqsSnapshot.docs.forEach(doc => {
        reqMap.set(doc.id, doc.data());
    });

    // Fetch all AI matches globally
    const allMatchesSnapshot = await adminDb.collectionGroup('ai_matches').get();
    
    for (const matchDoc of allMatchesSnapshot.docs) {
      const matchData = matchDoc.data();
      const candRef = matchDoc.ref.parent.parent; 
      
      if (!candRef) {
          // Orphaned doc structure somehow
          await matchDoc.ref.delete();
          deletedMatchesCount++;
          continue;
      }
      
      const candId = candRef.id;
      const reqId = matchDoc.id; // Or matchData.requirementId
      
      const cand = candidateMap.get(candId);
      const reqObj = reqMap.get(reqId);
      
      let shouldDelete = false;

      // 1. Missing candidate or requirement
      if (!cand || !reqObj) {
          shouldDelete = true;
      } else {
          // 2. Candidate is archived, deleted, or blacklisted
          const isArchived = cand.status === 'archived' || cand.isArchived;
          const isDeleted = cand.status === 'deleted' || cand.isDeleted;
          const isBlacklisted = cand.status === 'blacklisted' || cand.isBlacklisted;
          
          if (isArchived || isDeleted || isBlacklisted) {
              shouldDelete = true;
          }
          
          // 3. Requirement is closed (assuming closed/filled statuses to exclude)
          const isReqClosed = reqObj.status === 'CLOSED' || reqObj.status === 'FILLED';
          if (isReqClosed) {
              shouldDelete = true;
          }
      }

      if (shouldDelete) {
          await matchDoc.ref.delete();
          deletedMatchesCount++;
      }
    }

    return res.status(200).json({ success: true, deletedMatchesCount });
  } catch (e: any) {
    console.error('Cleanup Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
