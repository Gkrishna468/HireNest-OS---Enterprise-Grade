import { adminDb } from '../src/lib/firebase-admin.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!adminDb) return res.status(503).json({ error: "Firebase Admin is running in fallback mode. Missing or invalid FIREBASE_SERVICE_ACCOUNT." });

  try {
    const role = req.headers['x-user-role'] || req.query.role;
    if (role !== 'adminHQ') {
      return res.status(403).json({ error: 'Only Admin HQ can view match health.' });
    }

    const candidatesSnapshot = await adminDb.collection('candidatePool').get();
    const candidateMap = new Map();
    candidatesSnapshot.docs.forEach((doc: any) => {
        candidateMap.set(doc.id, doc.data());
    });

    const reqsSnapshot = await adminDb.collection('requirements_public').get();
    const reqMap = new Map();
    reqsSnapshot.docs.forEach((doc: any) => {
        reqMap.set(doc.id, doc.data());
    });

    const allMatchesSnapshot = await adminDb.collectionGroup('ai_matches').get();
    
    let totalMatches = allMatchesSnapshot.docs.length;
    let activeMatches = 0;
    let orphanMatches = 0;
    let archivedCandidatesReferenced = 0;
    let deletedCandidatesReferenced = 0;
    let missingCandidatesReferenced = 0;
    let missingRequirementsReferenced = 0;

    for (const matchDoc of allMatchesSnapshot.docs) {
      const candRef = matchDoc.ref.parent.parent; 
      if (!candRef) {
          orphanMatches++;
          continue;
      }
      
      const candId = candRef.id;
      const reqId = matchDoc.id;
      
      const cand = candidateMap.get(candId);
      const reqObj = reqMap.get(reqId);

      if (!cand) {
          missingCandidatesReferenced++;
      }
      if (!reqObj) {
          missingRequirementsReferenced++;
      }

      if (cand && reqObj) {
          const isArchived = cand.status === 'archived' || cand.isArchived;
          const isDeleted = cand.status === 'deleted' || cand.isDeleted;
          const isBlacklisted = cand.status === 'blacklisted' || cand.isBlacklisted;
          const isReqClosed = reqObj.status === 'CLOSED' || reqObj.status === 'FILLED';

          if (isArchived) archivedCandidatesReferenced++;
          if (isDeleted) deletedCandidatesReferenced++;
          if (!isArchived && !isDeleted && !isBlacklisted && !isReqClosed) {
              activeMatches++;
          }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
          requirements: reqsSnapshot.size,
          candidates: candidatesSnapshot.size,
          totalMatches,
          activeMatches,
          orphanMatches,
          archivedCandidatesReferenced,
          deletedCandidatesReferenced,
          missingCandidatesReferenced,
          missingRequirementsReferenced,
          lastCheck: new Date().toISOString()
      }
    });
  } catch (e: any) {
    console.error('Match Health Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
