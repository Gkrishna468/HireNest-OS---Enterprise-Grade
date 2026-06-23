import { adminDb, adminAuth, runtimeMode } from "../../lib/firebase-admin.js";
import { getAuth } from "firebase-admin/auth";

const computeFinancials = async (db: any, opts: any) => ({ 
  accountsReceivable: 125000, unbilledTime: 45000, daysSalesOutstanding: 32, vendorPayoutsPending: 85000,
  profit: 5000, vendorPayout: 2000, marginRate: 0.3, appliedPolicy: "standard"
});
const startSaga = async (sagaName: string, payload: any, steps: string[]) => {
  console.log(`[SAGA] Starting saga ${sagaName}`);
};
const dispatchWorkflowEvent = async (db: any, payload: any) => {
   if (!db) return;
   try {
     const docRef = db.collection("system_events").doc();
     await docRef.set({
       ...payload,
       type: payload.eventType || payload.type,
       id: docRef.id,
       createdAt: new Date().toISOString()
     });
     console.log(`[EVENT BUS] Dispatched: ${payload.eventType || payload.type} to system_events`);
   } catch (e) {
     console.error("[EVENT BUS] Failed to dispatch event:", e);
   }
};

import matchingGlobalHandler from "./matching-global.js";
import candidatesHandler from "./candidates.js";
import rescanMatchesHandler from "./rescan-matches.js";
import rebuildMatrixHandler from "./rebuild-matrix.js";
import cleanupMatchesHandler from "./cleanup-matches.js";
import matchHealthHandler from "./match-health.js";
import clientAiMatchesHandler from "./client-ai-matches.js";

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
    } else if (rawPath.includes('finalize-onboarding')) {
      action = 'finalize-onboarding';
    } else if (rawPath.includes('onboard-request')) {
      action = 'onboard';
    } else if (rawPath.includes('notify-approval')) {
      action = 'notify-approval';
    } else if (rawPath.includes('approve-requirement')) {
      action = 'approve-requirement';
    } else if (rawPath.includes('notifications')) {
      action = 'notifications';
    } else if (rawPath.includes('telemetry')) {
      action = 'telemetry';
    } else if (rawPath.includes('governance')) {
      action = 'governance';
    } else if (rawPath.includes('strategy/analyze') || rawPath.includes('strategy-analyze')) {
      action = 'strategy-analyze';
    } else if (rawPath.includes('matching-global')) {
      action = 'matching-global';
    } else if (rawPath.includes('candidates')) {
      action = 'candidates';
    } else if (rawPath.includes('rescan-matches')) {
      action = 'rescan-matches';
    } else if (rawPath.includes('rebuild-matrix')) {
      action = 'rebuild-matrix';
    } else if (rawPath.includes('cleanup-matches')) {
      action = 'cleanup-matches';
    } else if (rawPath.includes('match-health')) {
      action = 'match-health';
    } else if (rawPath.includes('client-matches') || rawPath.includes('client-ai-matches')) {
      action = 'client-ai-matches';
    } else {
      action = 'unknown';
    }
  }

  try {
    if (action === 'rescan-matches') return rescanMatchesHandler(req, res);
    if (action === 'rebuild-matrix') return rebuildMatrixHandler(req, res);
    if (action === 'cleanup-matches') return cleanupMatchesHandler(req, res);
    if (action === 'match-health') return matchHealthHandler(req, res);
    if (action === 'client-ai-matches') return clientAiMatchesHandler(req, res);
    if (action === 'matching-global') {
      return matchingGlobalHandler(req, res);
    }
    if (action === 'candidates') {
      return candidatesHandler(req, res);
    }

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
      console.log("[ADMIN METRICS] request started");
      const type = req.query.type || "admin";
      
      if (!adminDb) {
        console.warn("[ADMIN METRICS] adminDb is falsy, returning zeroed metrics");
        return res.status(200).json({
          revenue: 0, spending: 0, activeDeals: 0, placements: 0,
          avgMargin: 0, vendorQuality: 0, recruiterProductivity: 0, lastUpdate: new Date().toISOString()
        });
      }
      
      try {
        console.log("[ADMIN METRICS] querying collections...");
        const [requirementsSnap, candidatesSnap, submissionsSnap] = await Promise.all([
          adminDb.collection("requirements_public").get().catch((e: any) => { console.error("[METRICS] req err", e); return { docs: [], size: 0 }; }),
          adminDb.collection("candidatePool").get().catch((e: any) => { console.error("[METRICS] pool err", e); return { docs: [], size: 0 }; }),
          adminDb.collection("submissions").get().catch((e: any) => { console.error("[METRICS] sub err", e); return { docs: [], size: 0 }; })
        ]);
        
        console.log("[ADMIN METRICS] aggregation calculations starting");
        
        let clientBudgetSum = 0;
        let vendorPayoutSum = 0;
        let platformProfitSum = 0;

        requirementsSnap.docs.forEach((doc: any) => {
          const data = doc.data();
          if (data.status === 'PUBLISHED' || data.status === 'ACTIVE' || data.status === 'CLOSED') {
             if (data.financials) {
                clientBudgetSum += Number(data.financials.clientBudget) || 0;
                vendorPayoutSum += Number(data.financials.vendorPayout) || 0;
                platformProfitSum += Number(data.financials.platformProfit) || 0;
             } else if (data.vendorVisibleBudget) {
                clientBudgetSum += Number(data.vendorVisibleBudget) || 0;
             }
          }
        });
        
        let hiredCount = 0;
        submissionsSnap.docs.forEach((doc: any) => {
           if (doc.data().status === 'HIRED' || doc.data().status === 'PLACED') {
              hiredCount++;
           }
        });
        
        let revenue = 0;
        let spending = 0;

        if (type === 'admin') {
           revenue = platformProfitSum; // Platform recognizes profit as revenue
           spending = vendorPayoutSum; // Platform's spending is payout to vendors
        } else if (type === 'vendor') {
           revenue = vendorPayoutSum; // Vendor's revenue is what platform pays
           spending = 0; // Standard Vendor spending is not actively tracked here
        } else if (type === 'client') {
           revenue = 0; // Clients don't generate direct platform revenue visually
           spending = clientBudgetSum; // Client's spending is the total budget
        }
        
        const result = {
          revenue: revenue,
          spending: spending,
          activeDeals: submissionsSnap.size,
          placements: hiredCount,
          avgMargin: platformProfitSum > 0 && clientBudgetSum > 0 ? (platformProfitSum / clientBudgetSum) * 100 : 0,
          vendorQuality: 0, // Should be computed dynamically based on real performance
          recruiterProductivity: 0, // Should be computed based on activity
          lastUpdate: new Date().toISOString()
        };
        
        console.log("[ADMIN METRICS] success", result);
        return res.status(200).json(result);
      } catch (err: any) {
        console.error("[ADMIN METRICS ERROR]", err);
        return res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : String(err),
          stack: process.env.NODE_ENV === "development" ? err.stack : undefined
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
       const finalOrgType = role?.includes('vendor') ? 'VENDOR' : 'CLIENT';
       await adminDb.collection("organizations").doc(orgId).set({ 
           id: orgId, 
           organizationId: orgId, 
           companyName: requestData?.companyName || "New Org", 
           orgType: finalOrgType, 
           type: finalOrgType.toLowerCase(), // keep for legacy backwards compatibility
           status: 'ACTIVE', 
           tenantId: "TENANT-HQ",
           sourceSystem: "OS",
           createdAt: new Date().toISOString() 
       });
       const userRecord = await adminAuth.createUser({ email: requestData?.email, password: "DefaultPassword123!", displayName: requestData?.companyName });
       await adminDb.collection("users").doc(userRecord.uid).set({ uid: userRecord.uid, email: requestData?.email, role: role || 'client_admin', organizationId: orgId, status: 'ACTIVE', createdAt: new Date().toISOString() });
       await adminDb.collection("onboarding_requests").doc(requestId).update({ verificationStatus: 'VERIFIED', approvedAt: new Date().toISOString() });
       return res.status(200).json({ ok: true });
    }

    if (action === 'finalize-onboarding') {
       if (!adminDb) {
         return res.status(503).json({ error: "Administrative runtime unavailable", status: "degraded" });
       }
       const { orgId, orgType, companyName, userProfile } = req.body;
       
       if (orgId) {
         await adminDb.collection("organizations").doc(orgId).set({
           id: orgId,
           organizationId: orgId,
           companyName: companyName,
           type: orgType,
           status: "active",
           onboardingCompleted: true,
           createdAt: new Date().toISOString()
         }, { merge: true });
       }
       
       if (userProfile && userProfile.uid) {
         await adminDb.collection("users").doc(userProfile.uid).set(userProfile, { merge: true });
       }
       
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
    if (action === 'strategy-analyze') {
      return res.status(200).json({ analysis: "Strategic Engine Connected. Awaiting full IAM permission bindings on the Vercel Node for active data synthesis." });
    }

    if (action === 'governance-data' || action === 'governance') {
      const collections = [
        "users", "organizations", "requirements", "candidates", "submissions", "onboarding_requests",
        "durableExecutions", "agentRuntimePools", "billingLedgers", "tenantEconomics", "tenantInfrastructureMap",
        "distributedTraces", "arbitrationLocks", "cognitiveMemoryGraphs", "infrastructureMigrations", "governancePolicies",
        "consensusLeases", "infrastructureSimulations", "recursiveReasoningTrees", "immuneQuarantines", "federatedBroadcasts",
        "tenant_usage", "ai_usage_logs"
      ];
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
      try {
        const { id, reqId, reqId: bodyReqId, actualBudget, marginValue, marginType, currency, orgId } = req.body;
        const targetId = id || reqId || bodyReqId || req.body.financials?.reqId;
        
        if (!targetId) {
          return res.status(400).json({ error: "Missing requirement ID" });
        }

        if (!adminDb) {
          // Fallback: If adminDb is missing, we allow the client to perform the update natively
          // We return success so the frontend's await fetch() doesn't throw.
          return res.status(200).json({ ok: true, fallbackRequired: true });
        }

        const financials = await computeFinancials(adminDb, {
           actualBudget: Number(actualBudget || req.body.financials?.clientBudget) || 0,
           currency: currency || req.body.financials?.clientCurrency || "INR",
           enterpriseId: orgId
        });
        
        const profit = financials.profit;
        const vendorPayout = financials.vendorPayout;

        // Update core requirement record to active / published status
        await adminDb.collection("requirements_public").doc(targetId).update({
          status: "PUBLISHED",
          visibility: "VENDOR_NETWORK",
          adminApproved: true,
          financials: {
            clientBudget: req.body.financials?.clientBudget || actualBudget,
            clientCurrency: req.body.financials?.clientCurrency || currency || "INR",
            staffingModel: req.body.financials?.staffingModel || "Permanent",
            adminMargin: profit,
            vendorPayout: vendorPayout,
            platformProfit: profit,
            marginConfig: { type: "POLICY_ENGINE", value: financials.marginRate, policy: financials.appliedPolicy }
          },
          publishedAt: new Date().toISOString()
        });

        // Maintain status within administrative queues
        try {
          await adminDb.collection("jobApprovalQueue").doc(targetId).update({
            status: "APPROVED",
            approvedAt: new Date().toISOString()
          });
        } catch (queueErr) {
          console.warn("No corresponding queue document was found, bypassing non-blocking update:", queueErr);
        }
        
        try {
          // Start saga indicating distributed broadcast workflow
          await startSaga(
             "PUBLISH_REQUIREMENT_SAGA",
             { requirementId: targetId, orgId, budget: actualBudget },
             ["FINANCIAL_APPRAISAL", "INDEX_VECTOR_SEARCH", "BROADCAST_TO_VENDORS", "NOTIFY_CLIENT"]
          );

          // IMPORTANT: Emit JOB_PUBLISHED event for Vendor Workflow
          await dispatchWorkflowEvent(adminDb, {
            eventType: "JOB_PUBLISHED",
            eventVersion: "v2",
            producer: "api/admin",
            status: "QUEUED",
            payload: { jobId: targetId, marginValue, vendorPayout, timestamp: new Date().toISOString() }
          });
          
          import('./rescan-matches.js').then(({ runMatchIntelligenceEngine }) => {
              runMatchIntelligenceEngine(targetId, orgId).catch(err => {
                  console.error("Match Intelligence Engine failed:", err);
              });
          });
        } catch (evtErr) {
           console.warn("Failed to trigger JOB_PUBLISHED workflow saga", evtErr);
        }

        return res.status(200).json({ ok: true });
      } catch (err: any) {
        console.error("EXACT EXCEPTION IN approve-requirement:", err);
        return res.status(500).json({ error: err.message, stack: err.stack });
      }
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

    // 8. Telemetry Sink
    if (action === 'telemetry') {
      try {
        const traces = req.body;
        if (!Array.isArray(traces) || traces.length === 0) {
           return res.status(400).json({ success: false, message: "Invalid trace array payload" });
        }
        console.log(`[OTLP SINK] Ingested ${traces.length} distributed spans.`);
        return res.status(200).json({ success: true, processedCount: traces.length });
      } catch (err: any) {
        console.error("[OTLP SINK] Telemetry Sink Failure", err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // 9. Backfill Migration
    if (action === 'rebuild-revenue-pipeline') {
      if (!adminDb) return res.status(503).json({ error: "Administrative runtime unavailable" });
      try {
        const reqSnap = await adminDb.collection("requirements_public").get();
        const requirements = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const matchesSnap = await adminDb.collection("candidate_matches").get();
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const subsSnap = await adminDb.collection("submissions").get();
        const subs = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const dealSnap = await adminDb.collection("dealRooms").get();
        const deals = dealSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let processed = 0;
        const updates = [];

        for (const req of requirements) {
          const reqMatches = matches.filter((m: any) => m.requirementId === req.id);
          const reqSubs = subs.filter((s: any) => s.requirementId === req.id);
          const reqDeals = deals.filter((d: any) => d.requirementId === req.id);

          const interviews = reqSubs.filter((s: any) => s.status === 'INTERVIEWING').length + reqDeals.filter((d: any) => d.currentStage === 'Interview' || d.currentStage === 'Offer').length;
          const placements = reqSubs.filter((s: any) => s.status === 'HIRED' || s.status === 'SELECTED').length + reqDeals.filter((d: any) => d.currentStage === 'Hired' || d.status === 'WON').length;

          const pipelineValue = req.financials?.clientBilling ? (req.financials.clientBilling * (req.financials.commissionPercent || 0) / 100) : 0;
          
          let expectedRevenue = 0;
          reqMatches.forEach((m: any) => expectedRevenue += (m.expectedRevenue || 0));

          const realizedRevenue = placements * pipelineValue; // Simplified assumption

          const pipelineId = `REV-${req.id}`;
          updates.push(adminDb.collection("revenue_pipeline").doc(pipelineId).set({
            pipelineId,
            orgId: req.orgId || req.clientId || "ORG-UNKNOWN",
            crmOpportunityId: req.opportunityId || `OPP-${req.id}`,
            requirementId: req.id,
            pipelineValue,
            matches: reqMatches.length,
            submissions: reqSubs.length,
            interviews,
            placements,
            expectedRevenue,
            realizedRevenue,
            status: req.status === "CLOSED" ? "CLOSED" : "ACTIVE",
            updatedAt: new Date().toISOString()
          }, { merge: true }));
          processed++;
        }

        await Promise.all(updates);
        return res.status(200).json({ success: true, processed });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (action === 'migration-backfill') {
      if (!adminDb) return res.status(503).json({ error: "Administrative runtime unavailable" });
      try {
         let organizationsCreated = 0;
         let crmAccountsLinked = 0;
         let clientsLinked = 0;
         let vendorsLinked = 0;
         let requirementsUpdated = 0;
         let candidatesUpdated = 0;
         let missingDomains = 0;
         let duplicatesDetected = 0;
         let failures = 0;

         const updates = [];
         const processedOrgs = new Set<string>();
         
         // 0. Sync CRM Accounts, Clients, Vendors to Organizations
         const crmSnap = await adminDb.collection("crm_accounts").get();
         for (const doc of crmSnap.docs) {
             const data = doc.data();
             const orgId = data.id || doc.id;
             if (processedOrgs.has(orgId)) { duplicatesDetected++; continue; }
             processedOrgs.add(orgId);

             const domain = data.website ? data.website.replace(/^https?:\/\//, '').split('/')[0] : (data.domain || "");
             if (!domain) missingDomains++;

             updates.push(adminDb.collection("organizations").doc(orgId).set({
                 id: orgId,
                 orgId: orgId,
                 companyName: data.name || data.companyName || "Unnamed CRM Account",
                 orgType: data.type === 'Client' ? 'CLIENT' : 'VENDOR',
                 tenantId: data.tenantId || "TENANT-HQ",
                 sourceSystem: "CRM",
                 domain: domain,
                 primaryContact: data.primaryContact || null,
                 createdAt: data.createdAt || new Date().toISOString()
             }, { merge: true }));
             crmAccountsLinked++;
             organizationsCreated++;
         }

         const clientsSnap = await adminDb.collection("clients").get();
         for (const doc of clientsSnap.docs) {
             const data = doc.data();
             const orgId = data.id || doc.id;
             if (processedOrgs.has(orgId)) { duplicatesDetected++; continue; }
             processedOrgs.add(orgId);

             const domain = data.website ? data.website.replace(/^https?:\/\//, '').split('/')[0] : (data.domain || "");
             if (!domain) missingDomains++;

             updates.push(adminDb.collection("organizations").doc(orgId).set({
                 id: orgId,
                 orgId: orgId,
                 companyName: data.companyName || data.name || "Unnamed Client",
                 orgType: 'CLIENT',
                 tenantId: data.tenantId || "TENANT-HQ",
                 sourceSystem: "OS",
                 domain: domain,
                 primaryContact: data.primaryContact || null,
                 createdAt: data.createdAt || new Date().toISOString()
             }, { merge: true }));
             clientsLinked++;
             organizationsCreated++;
         }

         const vendorsSnap = await adminDb.collection("vendors").get();
         for (const doc of vendorsSnap.docs) {
             const data = doc.data();
             const orgId = data.id || doc.id;
             if (processedOrgs.has(orgId)) { duplicatesDetected++; continue; }
             processedOrgs.add(orgId);

             const domain = data.website ? data.website.replace(/^https?:\/\//, '').split('/')[0] : (data.domain || "");
             if (!domain) missingDomains++;

             updates.push(adminDb.collection("organizations").doc(orgId).set({
                 id: orgId,
                 orgId: orgId,
                 companyName: data.companyName || data.name || "Unnamed Vendor",
                 orgType: 'VENDOR',
                 tenantId: data.tenantId || "TENANT-HQ",
                 sourceSystem: "OS",
                 domain: domain,
                 primaryContact: data.primaryContact || null,
                 createdAt: data.createdAt || new Date().toISOString()
             }, { merge: true }));
             vendorsLinked++;
             organizationsCreated++;
         }

         const orgsSnap = await adminDb.collection("organizations").get();
         for (const doc of orgsSnap.docs) {
             const data = doc.data();
             const updatesObj: any = {};
             if (!data.tenantId) updatesObj.tenantId = "TENANT-HQ";
             if (!data.orgId) updatesObj.orgId = data.id || doc.id;
             if (!data.sourceSystem) updatesObj.sourceSystem = "OS";
             if (!data.orgType) updatesObj.orgType = (data.type || "").toUpperCase() === 'VENDOR' ? 'VENDOR' : 'CLIENT';
             if (!data.companyName) updatesObj.companyName = data.name || "Unnamed Organization";
             if (!data.domain && !processedOrgs.has(data.id || doc.id)) missingDomains++;
             
             if (Object.keys(updatesObj).length > 0) {
               updates.push(doc.ref.update(updatesObj));
             }
         }

         // 1. Backfill Requirements (reference orgId only)
         const reqSnap = await adminDb.collection("requirements_public").get();
         for (const doc of reqSnap.docs) {
            const data = doc.data();
            const updatesObj: any = {};
            if (!data.tenantId) updatesObj.tenantId = "TENANT-HQ";
            if (!data.orgId) {
               const potentialOrgId = data.clientId || data.enterpriseId;
               if (potentialOrgId) updatesObj.orgId = potentialOrgId;
            }
            if (!data.sourceSystem) updatesObj.sourceSystem = "OS";
            if (Object.keys(updatesObj).length > 0) {
              updates.push(doc.ref.update(updatesObj));
              requirementsUpdated++;
            }
         }

         // 2. Backfill Candidates (preserve vendorId intact)
         const candSnap = await adminDb.collection("candidatePool").get();
         for (const doc of candSnap.docs) {
            const data = doc.data();
            const updatesObj: any = {};
            if (!data.tenantId) updatesObj.tenantId = "TENANT-HQ";
            if (!data.vendorId && data.orgId) updatesObj.vendorId = data.orgId;
            if (!data.sourceSystem) updatesObj.sourceSystem = "OS";
            if (Object.keys(updatesObj).length > 0) {
              updates.push(doc.ref.update(updatesObj));
              candidatesUpdated++;
            }
         }

         try {
            await Promise.all(updates);
         } catch (e) {
            failures++;
            console.error("Batch update error:", e);
         }
         
         const auditLog = {
             organizationsCreated,
             crmAccountsLinked,
             clientsLinked,
             vendorsLinked,
             requirementsUpdated,
             candidatesUpdated,
             missingDomains,
             duplicatesDetected,
             failures,
             executedAt: new Date().toISOString()
         };

         await adminDb.collection("migration_logs").add(auditLog);
         
         return res.status(200).json({ success: true, processed: updates.length, audit: auditLog });
      } catch (err: any) {
         console.error("MIGRATION ERROR", err);
         return res.status(500).json({ error: err.message });
      }
    }

    res.status(404).json({ error: "Unknown admin action" });
  } catch (err: any) {
    console.error("[ADMIN CATCH-ALL ERROR]", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
}
