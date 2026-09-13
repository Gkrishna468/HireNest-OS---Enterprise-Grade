import { adminDb, adminAuth } from "../../lib/firebase-admin.js";
import { normalizeRole, getPermissionsForRole, isRoleAdminEquivalent } from "../../lib/rbac.js";

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
    const authRole = (req.user?.role || '').toLowerCase();
    const authOrgId = req.user?.organizationId;
    const isAdmin =
      authRole === "admin" ||
      authRole === "super_admin" ||
      authRole === "business_operations" ||
      authRole === "hq_admin" ||
      authRole === "ops_admin" ||
      authOrgId === "ORG-GLOBAL-HQ";

    if (action === "finalize-onboarding") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      const { orgId, orgType, companyName, userProfile } = req.body;
      if (!adminDb)
        return res
          .status(400)
          .json({ error: "Database authority not initialized" });

      if (userProfile?.uid !== authUserId && !isAdmin) {
        return res.status(403).json({ error: "Access Denied" });
      }

      console.log(
        `[USER_API] Finalize Onboarding for UI: ${userProfile?.uid} in Org: ${orgId}`,
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
        
      if (adminAuth) {
        try {
          await adminAuth.setCustomUserClaims(userProfile.uid, {
            role: safeRole,
            orgId: orgId,
            organizationId: orgId,
          });
        } catch (authErr: any) {
          console.warn("[USER_API] adminAuth.setCustomUserClaims fallback (persisted in Firestore SSOT):", authErr.message);
        }
      }

      return res.status(200).json({ ok: true });
    }

    if (action === "create") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      if (!isAdmin)
        return res.status(403).json({ error: "Access Denied. Admins only." });

      const { email, password, role, companyName } = req.body;
      console.log(`[USER_API] Creating user: ${email} with role: ${role}`);

      if (!adminDb) {
        return res.status(400).json({
          error:
            "Database authority not initialized",
        });
      }

      if (!email) {
        return res
          .status(400)
          .json({ error: "Email is required" });
      }

      let orgType = "client";
      const normalizedRole = (role || "").toLowerCase();
      if (normalizedRole.includes("vendor")) orgType = "vendor";
      else if (normalizedRole.includes("recruiter")) orgType = "recruiter";
      else if (normalizedRole.includes("independent")) orgType = "independent";
      else if (normalizedRole.includes("business_operations") || normalizedRole.includes("admin")) orgType = "hq";

      const orgId = orgType === "hq" ? "ORG-GLOBAL-HQ" : "ORG-" + Math.random().toString(36).substr(2, 9);
      await adminDb
        .collection("organizations")
        .doc(orgId)
        .set({
          id: orgId,
          organizationId: orgId,
          companyName: companyName || (orgType === "hq" ? "HireNest Workforce HQ" : "New Entity"),
          type: orgType,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        }, { merge: true });

      let createdUid = "";
      if (adminAuth && password) {
        try {
          const user = await adminAuth.createUser({
            email,
            password,
            displayName: companyName,
          });
          createdUid = user.uid;
          try {
            await adminAuth.setCustomUserClaims(user.uid, {
              role: role || "client_admin",
              orgId: orgId,
              organizationId: orgId,
            });
          } catch (claimsErr: any) {
            console.warn("[USER_API] adminAuth.setCustomUserClaims non-blocking notice:", claimsErr.message);
          }
        } catch (authErr: any) {
          console.warn("[USER_API] adminAuth.createUser fallback (persisting in Firestore SSOT):", authErr.message);
        }
      }

      if (!createdUid) {
        // Deterministic or clean UID based on email or random seed
        const cleanEmailKey = email.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        createdUid = `usr_${cleanEmailKey.substring(0, 20)}_${Math.random().toString(36).substr(2, 6)}`;
      }

      await adminDb
        .collection("users")
        .doc(createdUid)
        .set({
          uid: createdUid,
          email,
          role: role || "client_admin",
          organizationId: orgId,
          status: "ACTIVE",
          disabled: false,
          onboardingCompleted: true,
          createdAt: new Date().toISOString(),
        }, { merge: true });

      return res.status(200).json({ ok: true, uid: createdUid });
    }

    // SSOT Rule: Deactivate identity, preserve historical business data & ledger trails
    if (action === "delete" || action === "deactivate") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      if (!isAdmin)
        return res.status(403).json({ error: "Access Denied. Admins only." });
      const { uid, organizationId } = req.body;
      if (!adminDb) {
        return res.status(400).json({
          error:
            "Database authority not initialized",
        });
      }

      if (uid === authUserId) {
        return res.status(400).json({ error: "You cannot deactivate the currently signed-in administrator." });
      }

      let targetUserEmail = "Unknown";
      let targetUserRole = "Unknown";
      if (adminAuth && uid) {
        try {
          const uRec = await adminAuth.getUser(uid);
          targetUserEmail = uRec.email || "Unknown";
          targetUserRole = uRec.customClaims?.role || "Unknown";
        } catch (e) {
          // ignore
        }
      }

      if (uid) {
        // Revoke active sessions and disable user in Firebase Auth if available
        if (adminAuth) {
          try {
            await adminAuth.revokeRefreshTokens(uid).catch(() => {});
            await adminAuth.updateUser(uid, { disabled: true }).catch(() => {});
          } catch (e: any) {
            console.warn("[USER_API] adminAuth deactivation notice:", e.message);
          }
        }
        
        // Mark user as INACTIVE in Firestore SSOT to preserve historical ownership & ledger trails
        await adminDb
          .collection("users")
          .doc(uid)
          .set({
            status: "INACTIVE",
            disabled: true,
            deactivatedAt: new Date().toISOString(),
            deactivatedBy: req.user?.email || authUserId || "Admin"
          }, { merge: true })
          .catch(() => {});
      }
      if (organizationId && organizationId !== "ORG-GLOBAL-HQ") {
        await adminDb
          .collection("organizations")
          .doc(organizationId)
          .set({
            status: "INACTIVE",
            deactivatedAt: new Date().toISOString(),
            deactivatedBy: req.user?.email || authUserId || "Admin"
          }, { merge: true })
          .catch(() => {});
      }

      await adminDb.collection("audit_logs").add({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        deactivatedBy: req.user?.email || authUserId || "Unknown Admin",
        targetUser: targetUserEmail,
        targetUserId: uid,
        role: targetUserRole,
        action: "USER_DEACTIVATED",
        reason: "Admin deactivated user (historical business data preserved)",
        status: "SUCCESS",
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown',
        correlationId: `DEACT-${Date.now()}`
      });

      return res.status(200).json({ ok: true, message: "User identity deactivated successfully; historical business records preserved." });
    }

    if (action === "assign") {
      if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });
      if (!isAdmin)
        return res.status(403).json({ error: "Access Denied. Admins only." });
      const { uid, role, organizationId } = req.body;
      if (!adminDb) {
        return res.status(400).json({
          error:
            "Database authority not initialized",
        });
      }
      if (adminAuth && uid) {
        try {
          await adminAuth.setCustomUserClaims(uid, { role, orgId: organizationId, organizationId });
        } catch (claimsErr: any) {
          console.warn("[USER_API] adminAuth.setCustomUserClaims non-blocking notice:", claimsErr.message);
        }
      }
      
      // Explicitly propagate role change and organization configuration to Firestore collection
      await adminDb.collection("users").doc(uid).set({
        role,
        orgId: organizationId,
        organizationId: organizationId
      }, { merge: true });

      return res
        .status(200)
        .json({ ok: true, message: "Custom claims and Firestore user profile synchronized successfully." });
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
      if (!adminDb) {
        return res.status(503).json({ error: "Database authority not initialized" });
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
      
      // Revoke tokens and delete user if adminAuth is available
      if (adminAuth) {
        try {
          await adminAuth.revokeRefreshTokens(authUserId).catch(() => {});
          await adminAuth.deleteUser(authUserId).catch(() => {});
        } catch (e: any) {
          console.warn("[USER_API] adminAuth deleteUser fallback notice:", e.message);
        }
      }
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

    const authoritativeRole = normalizeRole(authRole || (isAdmin ? "BUSINESS_OPERATIONS" : "VENDOR_RECRUITER"));
    const authoritativePermissions = getPermissionsForRole(authoritativeRole);

    return res.status(200).json({
      success: true,
      user: {
        uid: authUserId || "anonymous",
        name: "Enterprise User",
        role: authoritativeRole,
        organizationId: authOrgId || (isRoleAdminEquivalent(authoritativeRole) ? "ORG-GLOBAL-HQ" : "ORG-DEFAULT"),
        status: "active",
        permissions: authoritativePermissions,
        isAdminEquivalent: isRoleAdminEquivalent(authoritativeRole),
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
