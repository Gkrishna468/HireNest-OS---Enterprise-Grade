import { adminDb } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  const { orgId, role, scan } = req.query;

  try {
    if (!adminDb) {
      return res.status(200).json({ success: true, candidates: [] });
    }

    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'ops_admin' || role === 'hq_admin' || orgId === 'ORG-GLOBAL-HQ' || orgId === 'ADMIN';

    let candidates: any[] = [];
    let snapshot;
    if (isAdmin) {
      snapshot = await adminDb.collection("candidatePool")
        .limit(100)
        .get();
      candidates = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } else if (role === 'client' || String(role).startsWith('client_')) {
      // Find jobs owned by this client
      const jobsSnapshot = await adminDb.collection("jobs")
          .where("clientId", "==", orgId || "GLOBAL")
          .get();
      const clientJobIds = jobsSnapshot.docs.map((d: any) => d.id);
      
      let candidateIds: string[] = [];
      if (clientJobIds.length > 0) {
          // Process in batches of 10 for "in" queries
          for (let i = 0; i < clientJobIds.length; i += 10) {
              const batchIds = clientJobIds.slice(i, i + 10);
              const subsSnapshot = await adminDb.collection("submissions")
                   .where("jobId", "in", batchIds)
                   .get();
              subsSnapshot.docs.forEach((doc: any) => {
                  candidateIds.push(doc.data().candidateId || doc.data().id);
              });
          }
      }

      // De-duplicate candidate IDs
      candidateIds = [...new Set(candidateIds)];

      for (const cId of candidateIds) {
          if (!cId) continue;
          const candGet = await adminDb.collection("candidatePool").doc(cId).get();
          if (candGet.exists) {
              candidates.push({ id: candGet.id, ...candGet.data() });
          }
      }
    } else {
      snapshot = await adminDb.collection("candidatePool")
        .where("vendorId", "==", orgId || "GLOBAL")
        .limit(100)
        .get();
      candidates = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    }

    return res.status(200).json({ success: true, candidates });
  } catch (error: any) {
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      console.warn("[CANDIDATES_API_WARN] adminDb unauthenticated, falling back to client-side query.");
    } else {
      console.error("[CANDIDATES_API_ERR] Error fetching candidates:", error.message);
    }
    return res.status(200).json({ success: true, candidates: [] });
  }
}
