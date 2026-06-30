import { adminDb } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  let { clientId } = req.query;

  const userId = req.user?.uid;
  let role = req.user?.role;
  let orgId = req.user?.organizationId;

  if (userId) {
    try {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        role = userDoc.data()?.role || role;
        orgId = userDoc.data()?.organizationId || orgId;
      }
    } catch (e) {
      console.error("[AUTH] Error", e);
    }
  }

  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "hq_admin" ||
    orgId === "ORG-GLOBAL-HQ";

  if (!isAdmin) {
    if (clientId && clientId !== orgId) {
      return res
        .status(403)
        .json({ error: "Access Denied: Orgnization Mismatch" });
    }
    clientId = orgId;
  }

  if (!clientId) return res.status(400).json({ error: "Missing clientId" });

  try {
    const snap = await adminDb
      .collection("submissions")
      .where("clientId", "==", clientId)
      .get();

    const submissionsMap = new Map();
    snap.docs.forEach((d: any) => {
      const sub = { id: d.id, ...d.data() };
      submissionsMap.set(sub.candidateId || sub.id, sub);
    });

    // Also pull AI Matches (from candidatePool) where targetClientOrg == clientId and mappedJobId exists
    const candsSnap = await adminDb
      .collection("candidatePool")
      .where("targetClientOrg", "==", clientId)
      .get();

    candsSnap.docs.forEach((d: any) => {
      const cand = d.data();
      if (!cand.mappedJobId || cand.status === "DELETED") return;

      if (!submissionsMap.has(d.id)) {
        submissionsMap.set(d.id, {
          id: d.id,
          candidateId: d.id,
          candidateName: cand.name || cand.fullName,
          requirementId: cand.mappedJobId,
          clientId: clientId,
          vendorId: cand.vendorId,
          status: "MATCHED",
          matchScore: cand.matchScore || cand.aiMatchScore || 0,
          skills: cand.skills || [],
          experience: cand.experience || "",
          createdAt: cand.createdAt || null,
        });
      }
    });

    const submissions = Array.from(submissionsMap.values());
    return res.status(200).json({ success: true, submissions });
  } catch (err: any) {
    console.error("CLIENT_SUBMISSIONS_ERROR", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
}
