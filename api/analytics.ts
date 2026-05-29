import { adminDb } from "../src/lib/firebase-admin.js";

export default async function analyticsHandler(req: any, res: any) {
  const apiPath = req.path.replace(/^\/api\/analytics\//, '').split('?')[0];

  try {
    if (!adminDb) {
      return res.status(200).json({
         revenue: 0,
         spending: 0,
         activeDeals: 0,
         placements: 0,
         avgMargin: 0,
         vendorQuality: 0,
         recruiterProductivity: 0,
         heatmaps: []
      });
    }

    const orgId = req.query.orgId;
    const userId = req.query.userId || req.user?.uid;
    const userRole = req.query.role || req.user?.role;
    let verifiedOrgId = orgId;
    
    // Security check to prevent Analytics Isolation Bypass
    if (userId) {
       const userDoc = await adminDb.collection("users").doc(userId).get();
       if (userDoc.exists) {
          const userData = userDoc.data();
          const role = userData?.role || 'guest';
          const isAdmin = role === 'admin' || role === 'super_admin' || role === 'ops_admin' || role === 'hq_admin' || userData?.organizationId === 'ORG-GLOBAL-HQ';
          
          if (!isAdmin) {
             verifiedOrgId = userData?.organizationId;
             if (orgId && orgId !== verifiedOrgId) {
                console.warn(`[SECURITY] User ${userId} attempted to access analytics for org ${orgId} but belongs to ${verifiedOrgId}`);
                return res.status(403).json({ error: "Access Denied: Analytics Domain Isolation Violation" });
             }
          }
       }
    }

    if (apiPath === 'client') {
       // Query jobs
       const reqsSnap = await adminDb.collection("requirements_public")
          .where("clientId", "==", verifiedOrgId || "UNKNOWN")
          .get();
       const subsSnap = await adminDb.collection("submissions")
          .where("clientId", "==", verifiedOrgId || "UNKNOWN")
          .get();
          
       let totalSpend = 0;
       reqsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.financials) {
             totalSpend += Number(data.financials.clientBudget) || 0;
          } else if (data.vendorVisibleBudget) {
             totalSpend += Number(data.vendorVisibleBudget) || 0;
          }
       });

       return res.status(200).json({
          spending: totalSpend,
          totalJobs: reqsSnap.size,
          openJobs: reqsSnap.docs.filter((d: any) => d.data().status === 'PUBLISHED').length,
          activeDeals: subsSnap.size,
          placements: subsSnap.docs.filter((d: any) => d.data().status === 'HIRED' || d.data().status === 'PLACED').length,
       });
    }

    if (apiPath === 'vendor') {
       const reqsSnap = await adminDb.collection("requirements_public").get();
       const candsSnap = await adminDb.collection("candidatePool")
          .where("vendorId", "==", verifiedOrgId || "UNKNOWN")
          .get();
       const subsSnap = await adminDb.collection("submissions")
          .where("vendorId", "==", verifiedOrgId || "UNKNOWN")
          .get();
          
       let revenue = 0;
       subsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status === 'HIRED' || data.status === 'PLACED') {
             revenue += Number(data.vendorPayout || data.financials?.vendorPayout) || 0;
          }
       });

       return res.status(200).json({
          revenue: revenue,
          totalCandidates: candsSnap.size,
          activeDeals: subsSnap.size,
          placements: subsSnap.docs.filter((d: any) => d.data().status === 'HIRED' || d.data().status === 'PLACED').length,
       });
    }

    if (apiPath === 'recruiter') {
       // assignedRecruiterId fallback logic
       let candsSnap = await adminDb.collection("candidatePool").get();
       let subsSnap = await adminDb.collection("submissions").get();
       
       let activeCandidates = 0;
       let actionQueue = 0;
       let placements = 0;
       
       candsSnap.docs.forEach((d: any) => {
          const data = d.data();
          const p = data.assignedRecruiterId || data.uploaderId || (data.vendorId === 'ORG-GLOBAL-HQ' ? 'ADMIN_HQ' : null);
          if (p === userId || p === 'ADMIN_HQ') {
             activeCandidates++;
          }
       });

       subsSnap.docs.forEach((d: any) => {
          const data = d.data();
          const p = data.assignedRecruiterId || data.uploaderId || 'ADMIN_HQ';
          if (p === userId || p === 'ADMIN_HQ') {
             actionQueue++; // active submissions
             if (data.status === 'HIRED') placements++;
          }
       });

       return res.status(200).json({
          activeCandidates,
          actionQueue,
          placements,
          recruiterProductivity: activeCandidates > 0 ? (placements / activeCandidates * 100) : 0,
       });
    }

    if (apiPath === 'hq') {
       const reqsSnap = await adminDb.collection("requirements_public").get();
       const candsSnap = await adminDb.collection("candidatePool").get();
       const subsSnap = await adminDb.collection("submissions").get();
       
       let platformRevenue = 0;
       reqsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.financials) {
             platformRevenue += Number(data.financials.platformProfit) || 0;
          }
       });

       return res.status(200).json({
          revenue: platformRevenue,
          totalJobs: reqsSnap.size,
          totalCandidates: candsSnap.size,
          activeDeals: subsSnap.size,
          placements: subsSnap.docs.filter((d: any) => d.data().status === 'HIRED' || d.data().status === 'PLACED').length,
       });
    }

    if (apiPath === 'hq-health') {
       // Only accessible if role is 'admin', 'hq_admin', or 'super_admin'
       if (userRole !== 'admin' && userRole !== 'hq_admin' && userRole !== 'super_admin' && userRole !== 'ops_admin') {
          return res.status(403).json({ error: "Access Denied. HQ Role required." });
       }
       
       // Analytics aggregation snapshot
       const eventsSnap = await adminDb.collection("operationalEvents").orderBy("timestamp", "desc").limit(500).get();
       
       const events = eventsSnap.docs.map(d => d.data());
       
       const eventThroughput = eventsSnap.size;
       
       const failedAIParses = events.filter(e => e.type === 'CandidateEnriched' && (e.metadata?.status?.includes('failed') || e.metadata?.status?.includes('error'))).length;
       const failedMatches = events.filter(e => e.type === 'CandidateMatched' && (e.metadata?.status?.includes('failed') || e.metadata?.status?.includes('error'))).length;
       const submissionVelocity = events.filter(e => ['SubmissionCreated', 'Submission'].includes(e.type)).length;
       const dealRoomGrowth = events.filter(e => e.type === 'DealRoomOpened').length;
       const systemErrors = events.filter(e => e.metadata?.isError === true || e.metadata?.status === 'error' || e.type?.includes("Error")).length;
       
       return res.status(200).json({
          eventThroughput,
          failedAIParses,
          failedMatches,
          submissionVelocity,
          dealRoomGrowth,
          systemErrors,
          eventsAnalyzed: events.length
       });
    }

    return res.status(404).json({ error: "Unknown analytics route" });

  } catch (err: any) {
    console.error("[ANALYTICS CATCH-ALL ERROR]", err);
    return res.status(500).json({ error: err.message });
  }
}
