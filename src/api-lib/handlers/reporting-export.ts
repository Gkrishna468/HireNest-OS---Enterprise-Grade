/**
 * HireNestOS Read-Only Reporting Export Endpoint
 * Authorized, read-only projection endpoint for spreadsheet viewers / reporting tools.
 * Enforces role-based field minimization, refresh timestamps, and ABAC privacy.
 * Does NOT allow external mutations or spreadsheet-to-Firestore synchronization.
 */

import { adminDb } from "../../lib/firebase-admin.js";
import { formatINR } from "../../lib/currency.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed: Reporting export is read-only" });
  }

  if (!adminDb) {
    return res.status(500).json({ error: "Firestore Admin DB unavailable" });
  }

  const userRole = (req.user?.role || req.headers["x-user-role"] || "guest").toLowerCase();

  // Reject Vendor and Client access to internal reporting exports
  if (userRole.includes("vendor") || userRole.includes("client")) {
    return res.status(403).json({ error: "Access Denied: Internal reporting projections are restricted from external vendor/client roles" });
  }

  const isFinanceAuthorized = ["admin", "hq_admin", "super_admin", "finance", "ceo"].includes(userRole);

  try {
    const format = req.query?.format === "csv" ? "csv" : "json";
    const now = new Date().toISOString();

    // Fetch Submissions and Active Requirements
    const subsSnap = await adminDb.collection("submissions").get().catch(() => ({ docs: [] }));
    const submissions = subsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const reqsSnap = await adminDb.collection("requirements").get().catch(() => ({ docs: [] }));
    const requirements = reqsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const rows = submissions.map(sub => {
      const billing = Number(sub.clientBillingRate || 1000);
      const payout = Number(sub.vendorPayoutRate || 650);
      const margin = billing - payout;

      const baseRow: any = {
        submissionId: sub.id,
        requirementId: sub.requirementId || "N/A",
        candidateId: sub.candidateId || "N/A",
        candidateName: sub.candidateName || "Candidate",
        source: sub.vendorId ? "Vendor Partner" : "Direct Applicant",
        stage: sub.status || "SUBMITTED",
        updatedAt: sub.updatedAt || sub.createdAt || now,
        owner: sub.owner || sub.assignedRecruiter || "Unassigned"
      };

      if (isFinanceAuthorized) {
        baseRow.billingRateINR = formatINR(billing);
        baseRow.payoutRateINR = formatINR(payout);
        baseRow.grossMarginINR = formatINR(margin);
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
        financeFieldsIncluded: isFinanceAuthorized
      },
      data: rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Reporting export failed: ${err.message}` });
  }
}
