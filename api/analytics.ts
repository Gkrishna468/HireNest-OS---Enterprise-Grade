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
       let activeReqs = 0;
       
       reqsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status === 'PUBLISHED' || data.status === 'ACTIVE') activeReqs++;
          if (data.financials) {
             totalSpend += Number(data.financials.clientBudget) || 0;
          } else if (data.vendorVisibleBudget) {
             totalSpend += Number(data.vendorVisibleBudget) || 0;
          }
       });
       
       let pendingReview = 0;
       let interviews = 0;
       let placements = 0;
       
       subsSnap.docs.forEach((d: any) => {
          const status = (d.data().status || '').toUpperCase();
          if (status === 'SUBMITTED') pendingReview++;
          if (status.includes('INTERVIEW') || status === 'SHORTLISTED') interviews++;
          if (['OFFER_RELEASED', 'OFFER_ACCEPTED', 'ONBOARDED', 'HIRED', 'PLACED'].includes(status)) placements++;
       });

       return res.status(200).json({
          spending: totalSpend,
          totalJobs: activeReqs, // Represents "Active Requirements"
          openJobs: activeReqs,
          totalCandidates: pendingReview, // Represents "Pending Review" on Client Dash
          interviewsToday: interviews, // Represents "Interviews Scheduled"
          placements: placements,
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
       let interviews = 0;
       let placements = 0;
       
       let activeSubs = 0;
       subsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status === "DELETED" || data.isActive === false) return;
          activeSubs++;
          const status = (data.status || '').toUpperCase();
          if (status.includes('INTERVIEW') || status === 'SHORTLISTED') interviews++;
          if (['OFFER_RELEASED', 'OFFER_ACCEPTED', 'ONBOARDED', 'HIRED', 'PLACED'].includes(status)) {
             placements++;
             revenue += Number(data.vendorPayout || data.financials?.vendorPayout) || 0;
          }
       });
       
       let activeCands = 0;
       candsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status !== "DELETED" && data.isActive !== false) {
             activeCands++;
          }
       });

       // Also check ownerVendorId if different
       const ownerCandsSnap = await adminDb.collection("candidatePool")
          .where("ownerVendorId", "==", verifiedOrgId || "UNKNOWN")
          .get();
       ownerCandsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status !== "DELETED" && data.isActive !== false && data.vendorId !== verifiedOrgId) {
             activeCands++;
          }
       });
       
       const ownerSubsSnap = await adminDb.collection("submissions")
          .where("ownerVendorId", "==", verifiedOrgId || "UNKNOWN")
          .get();
       ownerSubsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.status === "DELETED" || data.isActive === false || data.vendorId === verifiedOrgId) return;
          activeSubs++;
          const status = (data.status || '').toUpperCase();
          if (status.includes('INTERVIEW') || status === 'SHORTLISTED') interviews++;
          if (['OFFER_RELEASED', 'OFFER_ACCEPTED', 'ONBOARDED', 'HIRED', 'PLACED'].includes(status)) {
             placements++;
             revenue += Number(data.vendorPayout || data.financials?.vendorPayout) || 0;
          }
       });
       
       let allocatedReqs = 0;
       reqsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (!data.assignedVendorIds || data.assignedVendorIds.includes(verifiedOrgId)) {
             allocatedReqs++;
          }
       });

       return res.status(200).json({
          revenue: revenue,
          totalJobs: allocatedReqs, // Represents "Allocated Requirements" on Vendor Dash
          totalCandidates: activeCands, // Represents "Bench Candidates" on Vendor Dash
          interviewsToday: interviews, // Represents "Interviews Scheduled"
          activeDeals: activeSubs,
          placements: placements, // Represents "Active Placements"
       });
    }

    if (apiPath === 'recruiter') {
       const reqsSnap = await adminDb.collection("requirements_public").get();
       const candsSnap = await adminDb.collection("candidatePool").get();
       const subsSnap = await adminDb.collection("submissions").get();
       
       let activeCandidates = 0;
       let pendingSubmissions = 0;
       let interviews = 0;
       let offers = 0;
       let placements = 0;
       let pendingFeedback = 0;
       
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
             const status = (data.status || '').toUpperCase();
             if (status === 'MATCHED' || status === 'QUEUED') pendingSubmissions++;
             if (status.includes('INTERVIEW') || status === 'SHORTLISTED') interviews++;
             if (['OFFER_RELEASED', 'OFFER_ACCEPTED'].includes(status)) offers++;
             if (['ONBOARDED', 'HIRED', 'PLACED'].includes(status)) placements++;
             if (status === 'SUBMITTED' || status.includes('INTERVIEW_ROUND')) pendingFeedback++;
          }
       });
       
       let activeReqs = 0;
       reqsSnap.docs.forEach((d: any) => {
         const data = d.data();
         if (data.status === 'PUBLISHED' || data.status === 'ACTIVE') activeReqs++;
       });

       return res.status(200).json({
          totalJobs: activeReqs, // Represents "New Requirements"
          pendingSubmissions: pendingSubmissions, 
          interviewsToday: interviews,
          pendingFeedback: pendingFeedback,
          
          activeCandidates: activeCandidates,
          actionQueue: interviews, // Represents "Interviewing"
          offers: offers,
          placements: placements,
          
          conversionRate: activeCandidates > 0 ? Math.round((placements / activeCandidates) * 100) : 0,
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

    if (apiPath === 'hq-production-health') {
       if (userRole !== 'admin' && userRole !== 'hq_admin' && userRole !== 'super_admin' && userRole !== 'ops_admin') {
          return res.status(403).json({ error: "Access Denied. HQ Role required." });
       }

       const reqsSnap = await adminDb.collection("requirements_public").get();
       const candsSnap = await adminDb.collection("candidatePool").get();
       const subsSnap = await adminDb.collection("submissions").get();
       
       const allReqs = reqsSnap.docs.map(d => ({id: d.id, ...d.data()}));
       const allCands = candsSnap.docs.map(d => ({id: d.id, ...d.data()}));
       const allSubs = subsSnap.docs.map(d => ({id: d.id, ...d.data()}));

       // Requirement Integrity & Parity
       let parityHealthy = 0;
       let parityFailure = 0;
       let reqsNoMatches = 0;
       let reqsStale = 0;
       let healthyReqs = 0;
       
       const now = new Date();
       
       allReqs.forEach((r: any) => {
         const hasMatches = (r.matchesCount || 0) > 0;
         if (!hasMatches) reqsNoMatches++;
         
         const isStale = r.updatedAt ? (now.getTime() - new Date(r.updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000) : true;
         if (isStale && r.status === 'PUBLISHED') reqsStale++;
         
         // Mock Parity Check (checking if match count anomalies exist)
         if (r.adminHQMatches === undefined || r.adminHQMatches === r.matchesCount) {
             parityHealthy++;
             if (hasMatches && !isStale) healthyReqs++;
         } else {
             parityFailure++;
         }
       });

       // Candidate Ledger
       let mappedCorrectly = 0;
       let orphaned = 0;
       let missingVendor = 0;
       
       allCands.forEach((c: any) => {
         if (!c.vendorId && !c.uploaderId) missingVendor++;
         if (c.canonicalRequirementId) {
             mappedCorrectly++;
         } else {
             orphaned++;
         }
       });

       // Submissions Health
       const submissionsByStatus = allSubs.reduce((acc: any, s: any) => {
         acc[s.status] = (acc[s.status] || 0) + 1;
         return acc;
       }, {});
       
       const waiting48 = allSubs.filter((s: any) => s.updatedAt && (now.getTime() - new Date(s.updatedAt).getTime() > 2 * 24 * 60 * 60 * 1000) && ['SUBMITTED', 'INTERVIEWING'].includes(s.status)).length;
       const waiting7d = allSubs.filter((s: any) => s.updatedAt && (now.getTime() - new Date(s.updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000)).length;

       return res.status(200).json({
          integrity: {
             healthyReqs,
             parityHealthy,
             parityFailure,
             reqsNoMatches,
             reqsStale
          },
          ledger: {
             totalCandidates: allCands.length,
             mappedCorrectly,
             orphaned,
             duplicate: 0, // Mock duplicates for now until vector deduplication
             missingVendor
          },
          submissions: {
             submitted: submissionsByStatus['SUBMITTED'] || 0,
             interviewing: submissionsByStatus['INTERVIEWING'] || 0,
             offers: submissionsByStatus['OFFER'] || 0,
             placed: submissionsByStatus['PLACED'] || submissionsByStatus['HIRED'] || 0,
             waiting48,
             waiting7d
          }
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
