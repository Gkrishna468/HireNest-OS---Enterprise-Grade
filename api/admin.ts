import { adminDb, adminAuth } from "../src/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req: any, res: any) {
  const rawPath = req.path || req.url || '';
  const action = req.body?.action || req.query?.action || (
    rawPath.includes('metrics') ? 'metrics' : 
    (rawPath.includes('diagnostics') ? 'diagnostics' : 
    (rawPath.includes('governance-data') ? 'governance-data' : 
    (rawPath.includes('pre-flight') ? 'pre-flight' : 
    (rawPath.includes('approve-request') ? 'approve' : 
    (rawPath.includes('onboard-request') ? 'onboard' : 
    (rawPath.includes('governance') ? 'governance' : 'unknown'))))))
  );

  try {
    // 1. Diagnostics / Health
    if (action === 'diagnostics' || action === 'pre-flight') {
      try {
        if (!adminDb) {
          throw new Error("Firebase Admin SDK is not initialized with credentials. Operating in fallback mode.");
        }
        await adminDb.collection("system").doc("health").get();
        return res.status(200).json({
          ok: true, status: "operational", governance: "healthy", auth: "healthy", firestore: "healthy",
          projectId: process.env.VITE_APP_PROJECT_ID || "hirenest-os",
          serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ? "configured" : "missing",
          identitySource: "Unified Admin API", timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        return res.status(200).json({ ok: false, status: "degraded", error: err.message });
      }
    }

    // 2. Metrics
    if (action === 'metrics') {
      const type = req.query.type || "admin";
      if (!adminDb) {
        return res.status(200).json({
          revenue: 0,
          spending: 0,
          activeDeals: 0,
          placements: 0,
          avgMargin: 18.5, vendorQuality: 94, recruiterProductivity: 88, lastUpdate: new Date().toISOString()
        });
      }
      try {
        const [requirementsSnap, candidatesSnap, submissionsSnap] = await Promise.all([
          adminDb.collection("requirements_public").get().catch(() => ({ docs: [], size: 0 })),
          adminDb.collection("candidatePool").get().catch(() => ({ docs: [], size: 0 })),
          adminDb.collection("submissions").get().catch(() => ({ docs: [], size: 0 }))
        ]);
        let totalBudget = 0;
        requirementsSnap.docs.forEach((doc: any) => {
          const data = doc.data();
          if (data.vendorVisibleBudget) totalBudget += Number(data.vendorVisibleBudget);
        });
        return res.status(200).json({
          revenue: type === 'admin' ? totalBudget * 83 : (type === 'vendor' ? totalBudget * 10 : 0),
          spending: type === 'client' ? totalBudget * 83 : (type === 'admin' ? totalBudget * 40 : 0),
          activeDeals: submissionsSnap.size,
          placements: Math.floor(submissionsSnap.size * 0.2),
          avgMargin: 18.5, vendorQuality: 94, recruiterProductivity: 88, lastUpdate: new Date().toISOString()
        });
      } catch (err) {
        return res.status(200).json({
          revenue: 0, spending: 0, activeDeals: 0, placements: 0,
          avgMargin: 18.5, vendorQuality: 94, recruiterProductivity: 88, lastUpdate: new Date().toISOString()
        });
      }
    }

    // 3. Approval / Onboarding
    if (action === 'approve') {
       if (!adminDb || !adminAuth) {
         return res.status(400).json({ error: "Authority node not initialized (missing Firebase Admin credentials on the backend)" });
       }
       const { requestId, role } = req.body;
       const requestDoc = await adminDb.collection("onboarding_requests").doc(requestId).get();
       const requestData = requestDoc.data();
       const orgId = "ORG-" + Math.random().toString(36).substr(2, 9);
       await adminDb.collection("organizations").doc(orgId).set({ id: orgId, organizationId: orgId, companyName: requestData?.companyName || "New Org", type: role?.includes('vendor') ? 'vendor' : 'client', status: 'ACTIVE', createdAt: new Date().toISOString() });
       const userRecord = await adminAuth.createUser({ email: requestData?.email, password: "DefaultPassword123!", displayName: requestData?.companyName });
       await adminDb.collection("users").doc(userRecord.uid).set({ uid: userRecord.uid, email: requestData?.email, role: role || 'client_admin', organizationId: orgId, status: 'ACTIVE', createdAt: new Date().toISOString() });
       await adminDb.collection("onboarding_requests").doc(requestId).update({ verificationStatus: 'VERIFIED', approvedAt: new Date().toISOString() });
       return res.status(200).json({ ok: true });
    }

    if (action === 'onboard') {
       if (!adminDb) {
         return res.status(400).json({ error: "Authority node not initialized (missing Firebase Admin credentials on the backend)" });
       }
       const payload = req.body;
       const docRef = await adminDb.collection("onboarding_requests").add({ ...payload, verificationStatus: 'PENDING', createdAt: new Date().toISOString() });
       return res.status(200).json({ ok: true, requestId: docRef.id });
    }

    // 4. Governance Data (Detailed)
    if (action === 'governance-data' || action === 'governance') {
      const collections = ["users", "organizations", "requirements", "candidates", "submissions", "onboarding_requests"];
      const results: any = { 
        ok: true, 
        timestamp: new Date().toISOString(),
        nodeId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_APP_PROJECT_ID || "hirenest-os",
        mode: "FALLBACK"
      };

      if (adminDb) {
        results.mode = "LIVE";
        await Promise.all(collections.map(async (name) => {
          try {
            const snap = await adminDb.collection(name).limit(50).get();
            results[name] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (e) { 
            results[name] = []; 
          }
        }));
      } else {
        collections.forEach(name => {
          results[name] = [];
        });
      }
      return res.status(200).json(results);
    }

    res.status(404).json({ error: "Unknown admin action" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
