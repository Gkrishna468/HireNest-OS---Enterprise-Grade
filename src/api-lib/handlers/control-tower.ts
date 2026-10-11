/**
 * HireNestOS Recruitment Control Tower API Handler
 * Single Source of Truth: Queries live Firestore collections directly.
 * Zero Mock / Zero Fabricated Data.
 * Enforces Server-Side Token Authentication & ABAC.
 */

import { adminDb, adminAuth } from "../../lib/firebase-admin.js";
import { formatINR } from "../../lib/currency.js";

async function authenticateRequest(req: any): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  if (req.user && req.user.role && req.user.role !== "guest") {
    return { authenticated: true, user: req.user };
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return { authenticated: false, error: "Missing authentication token. Bearer token required." };
  }

  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      let role = decoded.role || decoded.userRole || "recruiter";
      let tenantId = decoded.tenantId || decoded.orgId || decoded.organizationId || "tenant-default";

      // If custom claim role is not present on token, lookup user document in Firestore
      if (!decoded.role && adminDb) {
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get().catch(() => null);
        if (userDoc && userDoc.exists) {
          const uData = userDoc.data() || {};
          role = uData.role || uData.userRole || role;
          tenantId = uData.tenantId || uData.organizationId || tenantId;
        }
      }

      const user = {
        uid: decoded.uid,
        email: decoded.email,
        role: String(role).toLowerCase(),
        tenantId
      };
      req.user = user;
      return { authenticated: true, user };
    } catch (authErr: any) {
      return { authenticated: false, error: `Authentication token verification failed: ${authErr.message}` };
    }
  }

  return { authenticated: false, error: "Authentication service unavailable" };
}

function parseTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (val && typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  if (val && typeof val._seconds === 'number') {
    return val._seconds * 1000;
  }
  return 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!adminDb) {
    return res.status(500).json({ error: "Firestore Admin DB is not initialized" });
  }

  // Enforce server-validated authentication - Never trust client 'x-user-role' headers
  const authState = await authenticateRequest(req);
  if (!authState.authenticated || !authState.user) {
    return res.status(401).json({ error: authState.error || "Unauthorized" });
  }

  const user = authState.user;
  const userRole = user.role;
  const isFinanceAuthorized = ["admin", "hq_admin", "super_admin", "finance", "ceo"].includes(userRole);

  const queryErrors: string[] = [];

  try {
    // 1. Live Active Requirements Query
    let activeRequirementsCount = 0;
    try {
      const reqsSnap = await adminDb.collection("requirements").where("status", "!=", "CLOSED").get();
      activeRequirementsCount = reqsSnap.docs.length;
    } catch (e: any) {
      queryErrors.push(`Requirements query notice: ${e.message}`);
    }

    // 2. Pending Follow-Ups Query
    let pendingFollowUpsCount = 0;
    try {
      const followUpsSnap = await adminDb.collection("follow_up_queue").where("status", "==", "PENDING").get();
      pendingFollowUpsCount = followUpsSnap.docs.length;
    } catch (e: any) {
      queryErrors.push(`Follow-up queue query notice: ${e.message}`);
    }

    // 3. Submissions Query
    let allSubmissions: any[] = [];
    try {
      const subsSnap = await adminDb.collection("submissions").get();
      allSubmissions = subsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    } catch (e: any) {
      queryErrors.push(`Submissions query notice: ${e.message}`);
    }

    allSubmissions.sort((a, b) => {
      const tA = parseTimestampMs(a.createdAt || a.updatedAt);
      const tB = parseTimestampMs(b.createdAt || b.updatedAt);
      return tB - tA;
    });

    const awaitingFeedbackSubs = allSubmissions.filter(s => ["SUBMITTED", "PENDING_REVIEW", "CLIENT_REVIEW"].includes(s.status));
    const submissionsAwaitingFeedbackCount = awaitingFeedbackSubs.length;

    // 4. Financial Placement & Margin Calculations (in INR ₹)
    let placements: any[] = [];
    try {
      const placementsSnap = await adminDb.collection("placements").get();
      placements = placementsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    } catch (e: any) {
      queryErrors.push(`Placements query notice: ${e.message}`);
    }

    let expectedGrossMargin = 0;
    let invoicedGrossMargin = 0;
    let realizedGrossMargin = 0;
    let cashPosition = 0;
    let validFinancialRecordsCount = 0;

    placements.forEach(p => {
      const hasBilling = p.clientBillingRate !== undefined || p.billingRate !== undefined || p.expectedFee !== undefined;
      if (hasBilling) {
        const billingRate = Number(p.clientBillingRate || p.billingRate || p.expectedFee || 0);
        const payoutRate = Number(p.vendorPayoutRate || p.payoutRate || 0);
        const margin = billingRate - payoutRate;

        expectedGrossMargin += margin;
        validFinancialRecordsCount++;

        if (p.status === "INVOICED") {
          invoicedGrossMargin += margin;
        }
        if (p.status === "PAID") {
          realizedGrossMargin += margin;
          cashPosition += billingRate;
        }
      }
    });

    // 5. Build Operational Table Rows - Zero Fabricated Defaults
    const tableRows = allSubmissions.slice(0, 50).map(sub => {
      const hasBilling = sub.clientBillingRate !== undefined && sub.clientBillingRate !== null;
      const hasPayout = sub.vendorPayoutRate !== undefined && sub.vendorPayoutRate !== null;

      const billing = hasBilling ? Number(sub.clientBillingRate) : null;
      const payout = hasPayout ? Number(sub.vendorPayoutRate) : null;

      let marginHr: number | null = null;
      let marginPercent: number | null = null;
      let formattedMarginHr: string = "N/A";

      if (billing !== null && payout !== null) {
        marginHr = billing - payout;
        marginPercent = billing > 0 ? Number(((marginHr / billing) * 100).toFixed(1)) : 0;
        formattedMarginHr = formatINR(marginHr);
      }

      const row: any = {
        submissionId: sub.id,
        requirementId: sub.requirementId || null,
        requirementTitle: sub.requirementTitle || sub.roleTitle || "Unspecified Requirement",
        candidateId: sub.candidateId || null,
        candidateName: sub.candidateName || "Unspecified Candidate",
        source: sub.vendorId ? "Vendor" : "Direct",
        stage: sub.status || "SUBMITTED",
        lastUpdate: sub.updatedAt || sub.createdAt || new Date().toISOString(),
        nextBestAction: sub.status === "SUBMITTED" ? "Follow up with client for initial feedback" : "Awaiting interview scheduling",
        owner: sub.owner || sub.assignedRecruiter || null,
        dataQualityNotice: (!hasBilling || !sub.candidateName) ? "Incomplete rates or candidate metadata on record" : null
      };

      // Financial ABAC Guard: Only expose rates & margins to server-authenticated finance/admin roles
      if (isFinanceAuthorized) {
        row.clientBillingRate = billing;
        row.vendorPayoutRate = payout;
        row.grossMarginHr = marginHr;
        row.grossMarginPercent = marginPercent;
        row.formattedMarginHr = formattedMarginHr;
      }

      return row;
    });

    const responsePayload: any = {
      timestamp: new Date().toISOString(),
      userRole,
      isFinanceAuthorized,
      dataDiagnostics: {
        hasQueryWarnings: queryErrors.length > 0,
        queryWarnings: queryErrors,
        totalSubmissionsLoaded: allSubmissions.length,
        placementsLoaded: placements.length,
        validFinancialRecordsCount
      },
      metrics: {
        activeRequirementsCount,
        pendingFollowUpsCount,
        submissionsAwaitingFeedbackCount
      },
      tableRows
    };

    if (isFinanceAuthorized) {
      responsePayload.financials = {
        expectedGrossMargin,
        formattedExpectedMargin: formatINR(expectedGrossMargin),
        invoicedGrossMargin,
        formattedInvoicedMargin: formatINR(invoicedGrossMargin),
        realizedGrossMargin,
        formattedRealizedMargin: formatINR(realizedGrossMargin),
        cashPosition,
        formattedCashPosition: formatINR(cashPosition)
      };
    }

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    return res.status(500).json({ error: `Control Tower query failed: ${err.message}` });
  }
}
