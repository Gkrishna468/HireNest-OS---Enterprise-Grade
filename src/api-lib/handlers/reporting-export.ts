/**
 * HireNestOS Read-Only Reporting Export Endpoint
 * Authorized, read-only projection endpoint for spreadsheet viewers / reporting tools.
 * Enforces server-verified authentication, ABAC field minimization, and PII privacy.
 * Zero fabricated numbers or default rates.
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
    return { authenticated: false, error: "Missing authentication token. Bearer token required for export." };
  }

  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      let role = decoded.role || decoded.userRole || "recruiter";
      let tenantId = decoded.tenantId || decoded.orgId || decoded.organizationId || "tenant-default";

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

function maskCandidateName(name?: string): string {
  if (!name || name === "Unspecified Candidate") return "Candidate [Masked]";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return `${parts[0][0]}. ***`;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed: Reporting export is strictly read-only" });
  }

  if (!adminDb) {
    return res.status(500).json({ error: "Firestore Admin DB unavailable" });
  }

  // Enforce server-validated authentication - Never trust x-user-role client headers
  const authState = await authenticateRequest(req);
  if (!authState.authenticated || !authState.user) {
    return res.status(401).json({ error: authState.error || "Unauthorized" });
  }

  const user = authState.user;
  const userRole = user.role;

  // Reject Vendor and Client access to internal reporting exports
  if (userRole.includes("vendor") || userRole.includes("client")) {
    return res.status(403).json({ error: "Access Denied: Internal reporting projections are restricted from external vendor/client roles" });
  }

  const isFinanceAuthorized = ["admin", "hq_admin", "super_admin", "finance", "ceo"].includes(userRole);
  const canViewFullPII = isFinanceAuthorized || ["lead_recruiter", "account_manager"].includes(userRole);

  try {
    const format = req.query?.format === "csv" ? "csv" : "json";
    const now = new Date().toISOString();

    const subsSnap = await adminDb.collection("submissions").get();
    const submissions = subsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const rows = submissions.map(sub => {
      const hasBilling = sub.clientBillingRate !== undefined && sub.clientBillingRate !== null;
      const hasPayout = sub.vendorPayoutRate !== undefined && sub.vendorPayoutRate !== null;

      const billing = hasBilling ? Number(sub.clientBillingRate) : null;
      const payout = hasPayout ? Number(sub.vendorPayoutRate) : null;
      const margin = (billing !== null && payout !== null) ? billing - payout : null;

      const rawCandidateName = sub.candidateName || "Unspecified Candidate";
      const displayName = canViewFullPII ? rawCandidateName : maskCandidateName(rawCandidateName);

      const baseRow: any = {
        submissionId: sub.id,
        requirementId: sub.requirementId || "N/A",
        candidateId: sub.candidateId || "N/A",
        candidateName: displayName,
        source: sub.vendorId ? "Vendor Partner" : "Direct Applicant",
        stage: sub.status || "SUBMITTED",
        updatedAt: sub.updatedAt || sub.createdAt || now,
        owner: sub.owner || sub.assignedRecruiter || "Unassigned"
      };

      if (isFinanceAuthorized) {
        baseRow.billingRateINR = billing !== null ? formatINR(billing) : "N/A";
        baseRow.payoutRateINR = payout !== null ? formatINR(payout) : "N/A";
        baseRow.grossMarginINR = margin !== null ? formatINR(margin) : "N/A";
      }

      return baseRow;
    });

    if (format === "csv") {
      const headers = Object.keys(rows[0] || {}).join(",");
      const csvLines = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      const csvContent = [headers, ...csvLines].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="HireNest_Recruitment_Report_${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    }

    return res.status(200).json({
      meta: {
        system: "HireNestOS Intelligence System",
        singleSourceOfTruth: "Firestore",
        refreshTimestamp: now,
        format: "JSON Projection",
        recordCount: rows.length,
        financeFieldsIncluded: isFinanceAuthorized,
        piiMinimized: !canViewFullPII
      },
      data: rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Reporting export failed: ${err.message}` });
  }
}
