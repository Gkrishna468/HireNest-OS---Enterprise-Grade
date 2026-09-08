import { adminDb, adminAuth } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  // Extract action from path or query
  const rawPath = req.path || req.url || "";
  const action =
    req.body?.action ||
    req.query?.action ||
    (rawPath.includes("export-data")
      ? "export-data"
      : rawPath.includes("delete-account")
        ? "delete-account"
        : rawPath.includes("create")
          ? "create"
          : rawPath.includes("delete")
            ? "delete"
            : rawPath.includes("assign")
              ? "assign"
              : rawPath.includes("finalize-onboarding")
                ? "finalize-onboarding"
                : "context");

  console.log(
    `[USER_API] Action: ${action} Method: ${req.method} Path: ${rawPath}`,
  );

  try {
    const authUserId = req.user?.uid;
    const authRole = req.user?.role;
    const authOrgId = req.user?.organizationId;
    const isAdmin =
      authRole === "admin" ||
      authRole === "super_admin" ||
      authRole === "hq_admin" ||
      authRole === "ops_admin" ||
      authOrgId === "ORG-GLOBAL-HQ";

    if (action === "finalize-onboarding") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      const { orgId, orgType, companyName, userProfile } = req.body;
      if (!adminDb || !adminAuth)
        return res
          .status(400)
          .json({ error: "Authority node not initialized" });

      if (userProfile.uid !== authUserId && !isAdmin) {
        return res.status(403).json({ error: "Access Denied" });
      }

      console.log(
        `[USER_API] Finalize Onboarding for UI: ${userProfile.uid} in Org: ${orgId}`,
      );
      await adminDb.collection("organizations").doc(orgId).set(
        {
          id: orgId,
          organizationId: orgId,
          type: orgType,
          companyName,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      );

      const safeRole = isAdmin
        ? userProfile.role
        : userProfile.role === "admin"
          ? "client_admin"
          : userProfile.role;

      await adminDb
        .collection("users")
        .doc(userProfile.uid)
        .set({ ...userProfile, role: safeRole }, { merge: true });
      await adminAuth.setCustomUserClaims(userProfile.uid, {
        role: safeRole,
        orgId: orgId,
      });

      return res.status(200).json({ ok: true });
    }

    if (action === "create") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      if (!isAdmin)
        return res.status(403).json({ error: "Access Denied. Admins only." });

      const { email, password, role, companyName } = req.body;
      console.log(`[USER_API] Creating user: ${email} with role: ${role}`);

      if (!adminDb || !adminAuth) {
        return res.status(400).json({
          error:
            "Authority node not initialized (missing Firebase Admin credentials on the backend)",
        });
      }

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }

      let orgType = "client";
      if (role.includes("vendor")) orgType = "vendor";
      else if (role.includes("recruiter")) orgType = "recruiter";
      else if (role.includes("independent")) orgType = "independent";

      const orgId = "ORG-" + Math.random().toString(36).substr(2, 9);
      await adminDb
        .collection("organizations")
        .doc(orgId)
        .set({
          id: orgId,
          organizationId: orgId,
          companyName: companyName || "New Entity",
          type: orgType,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        });

      const user = await adminAuth.createUser({
        email,
        password,
        displayName: companyName,
      });
      await adminDb
        .collection("users")
        .doc(user.uid)
        .set({
          uid: user.uid,
          email,
          role: role || "client_admin",
          organizationId: orgId,
          status: "ACTIVE",
          onboardingCompleted: true,
          createdAt: new Date().toISOString(),
        });
      await adminAuth.setCustomUserClaims(user.uid, {
        role: role || "client_admin",
        orgId: orgId,
      });
      return res.status(200).json({ ok: true, uid: user.uid });
    }

    if (action === "delete") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      if (!isAdmin)
        return res.status(403).json({ error: "Access Denied. Admins only." });
      const { uid, organizationId } = req.body;
      if (!adminDb || !adminAuth) {
        return res.status(400).json({
          error:
            "Authority node not initialized (missing Firebase Admin credentials on the backend)",
        });
      }

      if (uid === authUserId) {
        return res.status(400).json({ error: "You cannot delete the currently signed-in administrator." });
      }

      let deletedUserEmail = "Unknown";
      let deletedUserRole = "Unknown";
      try {
        const uRec = await adminAuth.getUser(uid);
        deletedUserEmail = uRec.email || "Unknown";
        deletedUserRole = uRec.customClaims?.role || "Unknown";
      } catch (e) {
        // ignore
      }

      if (uid) {
        // Find and delete any active sessions
        await adminAuth.revokeRefreshTokens(uid).catch(() => {});
        await adminAuth.deleteUser(uid).catch(() => {});
        await adminDb
          .collection("users")
          .doc(uid)
          .delete()
          .catch(() => {});
      }
      if (organizationId) {
        await adminDb
          .collection("organizations")
          .doc(organizationId)
          .delete()
          .catch(() => {});
      }

      await adminDb.collection("audit_logs").add({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        deletedBy: req.user?.email || authUserId || "Unknown Admin",
        deletedUser: deletedUserEmail,
        deletedUserId: uid,
        role: deletedUserRole,
        action: "USER_DELETED",
        reason: "Admin removed user",
        status: "SUCCESS",
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown',
        correlationId: `DEL-${Date.now()}`
      });

      return res.status(200).json({ ok: true });
    }

    if (action === "assign") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      if (!isAdmin)
        return res.status(403).json({ error: "Access Denied. Admins only." });
      const { uid, role, organizationId } = req.body;
      if (!adminDb || !adminAuth) {
        return res.status(400).json({
          error:
            "Authority node not initialized (missing Firebase Admin credentials on the backend)",
        });
      }
      await adminAuth.setCustomUserClaims(uid, { role, orgId: organizationId });
      return res
        .status(200)
        .json({ ok: true, message: "Custom claims updated." });
    }

    // Right to Data Portability / Subject Access Request (GDPR Art. 20, DPDP Act 2023 Sec. 11)
    if (action === "export-data") {
      if (!authUserId) {
        return res.status(401).json({ error: "Authentication required to export data." });
      }
      if (!adminDb) {
        return res.status(503).json({ error: "Database not available" });
      }

      // Fetch user profile
      const userDoc = await adminDb.collection("users").doc(authUserId).get();
      const userData = userDoc.exists ? userDoc.data() : null;

      // Fetch user organization
      let orgData = null;
      if (userData?.organizationId) {
        const orgDoc = await adminDb.collection("organizations").doc(userData.organizationId).get();
        if (orgDoc.exists) orgData = orgDoc.data();
      }

      // Fetch user activity logs scoped to user
      const userAuditLogs: any[] = [];
      try {
        const auditSnap = await adminDb.collection("audit_logs")
          .where("deletedUserId", "==", authUserId)
          .limit(50)
          .get();
        auditSnap.forEach((d: any) => userAuditLogs.push(d.data()));
      } catch (e) {
        // ignore
      }

      const exportPayload = {
        exportTimestamp: new Date().toISOString(),
        complianceFrameworks: ["DPDP Act 2023", "GDPR Art. 20", "CCPA/CPRA"],
        userProfile: {
          uid: authUserId,
          email: userData?.email || req.user?.email || null,
          role: userData?.role || req.user?.role || "guest",
          name: userData?.name || userData?.displayName || null,
          createdAt: userData?.createdAt || null,
          lastLoginAt: userData?.lastLoginAt || null,
        },
        organization: orgData ? {
          id: orgData.id || orgData.organizationId,
          companyName: orgData.companyName || orgData.name,
          type: orgData.type || orgData.orgType,
          status: orgData.status,
        } : null,
        metadata: {
          exportType: "Subject Access Request",
          retentionNotice: "Operational system access logs are retained in rolling format up to 180 days per CERT-In Cyber Security Directions 2022.",
        }
      };

      return res.status(200).json({ ok: true, data: exportPayload });
    }

    // Right to Erasure / Account Deletion Request (GDPR Art. 17, DPDP Act 2023 Sec. 12)
    if (action === "delete-account") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      if (!authUserId) {
        return res.status(401).json({ error: "Authentication required to request account deletion." });
      }
      if (!adminDb || !adminAuth) {
        return res.status(503).json({ error: "Authority node not initialized" });
      }

      const confirmation = req.body?.confirm;
      if (confirmation !== true && confirmation !== "DELETE") {
        return res.status(400).json({ error: "Explicit confirmation required: confirm must be 'DELETE' or boolean true." });
      }

      // Check if user is sole admin of ORG-GLOBAL-HQ
      if (authOrgId === "ORG-GLOBAL-HQ" && (authRole === "admin" || authRole === "super_admin")) {
        return res.status(400).json({ error: "Root Global HQ administrators cannot delete their root account via self-service. Contact platform governance." });
      }

      const userEmail = req.user?.email || "redacted@hirenest.os";
      
      // Revoke tokens and delete user
      await adminAuth.revokeRefreshTokens(authUserId).catch(() => {});
      await adminAuth.deleteUser(authUserId).catch(() => {});
      await adminDb.collection("users").doc(authUserId).delete().catch(() => {});

      // Record immutable audit event with CERT-In 180-day compliance metadata
      await adminDb.collection("audit_logs").add({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        action: "USER_SELF_ERASURE",
        userId: authUserId,
        userEmailMasked: userEmail.replace(/^(.{2})(.*)(@.*)$/, "$1***$3"),
        reason: req.body?.reason || "Data Subject Erasure Request",
        legalBasis: "DPDP Act 2023 Sec 12 / GDPR Art 17",
        certInMandate: "Security telemetry retained under CERT-In Directions 2022 (180 days)",
        status: "COMPLETED",
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown'
      });

      return res.status(200).json({
        ok: true,
        message: "Your account and personal profile have been successfully erased.",
        retentionNotice: "In accordance with CERT-In Cyber Security Directions 2022 and applicable financial compliance, non-PII security incident and transaction logs are maintained for a rolling statutory period of 180 days."
      });
    }

    // Default to Context
    let requirements: any[] = [];
    if (adminDb) {
      try {
        const queryOrgId = isAdmin
          ? req.query.orgId || req.body.orgId || authOrgId
          : authOrgId;
        const queryRole = isAdmin
          ? req.query.role || req.body.role || authRole
          : authRole;
        if (queryOrgId) {
          console.log(
            `[USER_API] Fetching proxy requirements for orgId: ${queryOrgId} under role: ${queryRole}`,
          );
          let requirementsSnap;
          const allReqsSnap = await adminDb
            .collection("requirements_public")
            .get();

          if (
            queryRole === "admin" ||
            queryRole === "super_admin" ||
            queryRole === "ops_admin"
          ) {
            requirements = allReqsSnap.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data(),
            }));
          } else if (
            queryRole === "vendor" ||
            queryRole?.includes("vendor") ||
            queryRole?.includes("recruiter") ||
            queryRole?.includes("independent")
          ) {
            // Supply layer sees all non-deleted, active/published public requirements
            requirements = allReqsSnap.docs
              .map((doc: any) => ({ id: doc.id, ...doc.data() }))
              .filter((r: any) => {
                const s = (r.status || "").toUpperCase();
                return s !== "DELETED" && s !== "ARCHIVED" && s !== "DRAFT";
              });
          } else {
            // Clients see their own requirements and all active public requirements
            requirements = allReqsSnap.docs
              .map((doc: any) => ({ id: doc.id, ...doc.data() }))
              .filter((r: any) => {
                const s = (r.status || "").toUpperCase();
                return (
                  r.clientId === queryOrgId ||
                  s === "ACTIVE" ||
                  s === "PUBLISHED" ||
                  s === "OPEN"
                );
              });
          }

          if (requirements && requirements.length > 0) {
            requirements = requirements.map((r: any) => ({
              ...r,
              createdAt: r.createdAt
                ? typeof r.createdAt.toDate === "function"
                  ? r.createdAt.toDate().toISOString()
                  : r.createdAt
                : null,
            }));
          }
        }
      } catch (dbErr) {
        console.warn(
          "[USER_API] Proxy requirements fetch failed or bypassed:",
          dbErr,
        );
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        uid: authUserId || "anonymous",
        name: "Enterprise User",
        role: authRole || "guest",
        organizationId: authOrgId || "",
        status: "active",
        permissions: isAdmin
          ? [
              "manage_users",
              "manage_requirements",
              "view_diagnostics",
              "execute_governance",
              "manage_vendors",
              "manage_clients",
            ]
          : [],
      },
      requirements,
      environment: "production",
      platformStatus: "stable",
    });
  } catch (err: any) {
    console.error(`[USER_API_CRITICAL_ERR] error during execution:`, err);
    res.status(500).json({
      error: err.message || "Internal Server Error",
      stack: err.stack,
      telemetry: "API_USER_FAIL_SAFE_DUMP",
    });
  }
}
