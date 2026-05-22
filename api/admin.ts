import { adminDb, adminAuth, runtimeMode } from "../src/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req: any, res: any) {
  const rawPath = req.path || req.url || '';
  let action = req.body?.action || req.query?.action;
  
  if (!action) {
    if (rawPath.includes('metrics')) {
      action = 'metrics';
    } else if (rawPath.includes('diagnostics')) {
      action = 'diagnostics';
    } else if (rawPath.includes('governance-data')) {
      action = 'governance-data';
    } else if (rawPath.includes('pre-flight')) {
      action = 'pre-flight';
    } else if (rawPath.includes('approve-request')) {
      action = 'approve';
    } else if (rawPath.includes('onboard-request')) {
      action = 'onboard';
    } else if (rawPath.includes('notify-approval')) {
      action = 'notify-approval';
    } else if (rawPath.includes('approve-requirement')) {
      action = 'approve-requirement';
    } else if (rawPath.includes('notifications')) {
      action = 'notifications';
    } else if (rawPath.includes('governance')) {
      action = 'governance';
    } else {
      action = 'unknown';
    }
  }

  try {
    // 1. Diagnostics / Health
    if (action === 'diagnostics' || action === 'pre-flight') {
      try {
        let healthData = {
          ok: !!adminDb,
          status: adminDb ? "operational" : "degraded",
          governance: adminDb ? "healthy" : "offline",
          auth: adminDb ? "healthy" : "offline",
          firestore: adminDb ? "healthy" : "degraded",
          projectId: process.env.VITE_APP_PROJECT_ID || "hirenest-os",
          serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ? "configured" : "missing",
          identitySource: "Unified Admin API",
          timestamp: new Date().toISOString(),
          runtimeMode: runtimeMode,
          adminSdkHealthy: !!adminDb,
          degradedRoutes: runtimeMode !== 'FULL_ADMIN' ? ["approve-requirement", "financial-policy", "orchestration", "cross-org-reads"] : [],
          queueBacklog: 0,
          failedMatches: 0
        };

        if (adminDb) {
          await adminDb.collection("system").doc("health").get();
        }
        return res.status(200).json(healthData);
      } catch (err: any) {
        return res.status(200).json({ ok: false, status: "degraded", error: err.message, runtimeMode, adminSdkHealthy: false, degradedRoutes: ["all-privileged"], queueBacklog: 0, failedMatches: 0 });
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
         return res.status(503).json({ error: "Administrative runtime unavailable", status: "degraded" });
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
         return res.status(503).json({ error: "Administrative runtime unavailable", status: "degraded" });
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

    // 5. Notify approval request
    if (action === 'notify-approval') {
      if (!adminDb) {
        return res.status(200).json({ ok: true, note: "Admin DB offline fallback" });
      }
      const { jobId, jobTitle, clientName } = req.body;
      await adminDb.collection("admin_notifications").add({
        message: `Pending budget approval request emitted for requirement "${jobTitle || 'unspecified'}" by client ${clientName || 'anonymous'}.`,
        status: "DISPATCHED",
        jobId: jobId || "",
        createdAt: new Date().toISOString()
      });
      return res.status(200).json({ ok: true });
    }

    // 6. Approve Requirement in details (with dynamic platform margin deduction)
    if (action === 'approve-requirement') {
      if (!adminDb) {
        return res.status(503).json({ error: "Administrative runtime unavailable", status: "degraded" });
      }
      const { id, actualBudget, marginValue, marginType, currency, orgId } = req.body;
      
      const { computeFinancials } = require("../api/lib/policyEngine");
      const financials = await computeFinancials(adminDb, {
         actualBudget: Number(actualBudget) || 0,
         currency: currency || "INR",
         enterpriseId: orgId
      });
      
      const profit = financials.profit;
      const vendorPayout = financials.vendorPayout;

      // Update core requirement record to active / published status
      await adminDb.collection("requirements_public").doc(id).update({
        status: "PUBLISHED",
        visibility: "VENDOR_NETWORK",
        adminApproved: true,
        financials: {
          clientBudget: actualBudget,
          clientCurrency: currency || "INR",
          staffingModel: "Permanent",
          adminMargin: profit,
          vendorPayout: vendorPayout,
          platformProfit: profit,
          marginConfig: { type: "POLICY_ENGINE", value: financials.marginRate, policy: financials.appliedPolicy }
        },
        publishedAt: new Date().toISOString()
      });

      // Maintain status within administrative queues
      try {
        await adminDb.collection("jobApprovalQueue").doc(id).update({
          status: "APPROVED",
          approvedAt: new Date().toISOString()
        });
      } catch (queueErr) {
        console.warn("No corresponding queue document was found, bypassing non-blocking update:", queueErr);
      }
      
      // Dispatch centralized workflow event
      try {
        const { dispatchWorkflowEvent } = require("../api/lib/workflowQueue");
        await dispatchWorkflowEvent(adminDb, {
          type: "JOB_APPROVED",
          source: "api/admin",
          status: "QUEUED",
          payload: { jobId: id, marginValue, vendorPayout, timestamp: new Date().toISOString() }
        });
      } catch (evtErr) {
         console.warn("Failed to trigger JOB_APPROVED workflow event", evtErr);
      }

      return res.status(200).json({ ok: true });
    }

    // 7. Get Recent Dispatched Alert Notifications
    if (action === 'notifications') {
      if (!adminDb) {
        return res.status(200).json([]);
      }
      try {
        const snap = await adminDb.collection("admin_notifications").orderBy("createdAt", "desc").limit(20).get();
        const notes = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(notes);
      } catch (err) {
        console.warn("Notifications collection query failed:", err);
        return res.status(200).json([]);
      }
    }

    res.status(404).json({ error: "Unknown admin action" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
