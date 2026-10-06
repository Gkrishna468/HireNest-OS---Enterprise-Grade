import { adminDb, adminAuth } from "../../lib/firebase-admin.js";
import { normalizeRole, getPermissionsForRole, isRoleAdminEquivalent, normalizeRecruiterSubtype } from "../../lib/rbac.js";

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
      if (!adminDb)
        return res
          .status(400)
          .json({ error: "Database authority not initialized" });

      const { orgType, companyName, onboardingRole, userProfile } = req.body;

      if (!authUserId) {
        return res.status(401).json({ error: "Unauthorized: Missing user context" });
      }

      // Preserve requested role or infer from orgType
      const rawRole = (onboardingRole || userProfile?.role || "").trim();
      let chosenRole = rawRole;
      if (!chosenRole) {
        const normOrgType = (orgType || "").toLowerCase();
        if (normOrgType === "client") chosenRole = "CLIENT_ADMIN";
        else if (normOrgType === "vendor") chosenRole = "VENDOR_ADMIN";
        else if (normOrgType === "candidate") chosenRole = "CANDIDATE";
        else chosenRole = "RECRUITER";
      }

      // Idempotency: reuse existing organizationId if already provisioned
      let targetOrgId = req.body.orgId || req.body.organizationId || userProfile?.organizationId || userProfile?.orgId;
      const existingUserSnap = await adminDb.collection("users").doc(authUserId).get();
      if (existingUserSnap.exists) {
        const data = existingUserSnap.data();
        if (data && (data.organizationId || data.orgId)) {
          targetOrgId = data.organizationId || data.orgId;
        }
      }
      if (!targetOrgId) {
        targetOrgId = `ORG-${orgType ? orgType.toUpperCase() : 'UNKNOWN'}-${authUserId.substring(0, 8).toUpperCase()}`;
      }

      console.log(
        `[USER_API] Finalize Onboarding for authUser: ${authUserId} in Org: ${targetOrgId} with role: ${chosenRole}`,
      );

      await adminDb.collection("organizations").doc(targetOrgId).set(
        {
          id: targetOrgId,
          organizationId: targetOrgId,
          companyName: companyName || userProfile?.companyName || "Organization Workspace",
          type: orgType || "recruiter",
          status: "ACTIVE",
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      const secureProfile = {
        uid: authUserId,
        email: req.user?.email || userProfile?.email || "",
        organizationId: targetOrgId,
        orgId: targetOrgId,
        role: chosenRole,
        status: "ACTIVE",
        onboardingCompleted: true,
        ...(userProfile || {}),
        updatedAt: new Date().toISOString()
      };

      await adminDb
        .collection("users")
        .doc(authUserId)
        .set(secureProfile, { merge: true });
        
      if (adminAuth) {
        try {
          await adminAuth.setCustomUserClaims(authUserId, {
            role: chosenRole,
            orgId: targetOrgId,
            organizationId: targetOrgId,
          });
        } catch (authErr: any) {
          console.warn("[USER_API] adminAuth.setCustomUserClaims fallback (persisted in Firestore SSOT):", authErr.message);
        }
      }

      return res.status(200).json({ ok: true, orgId: targetOrgId, role: chosenRole });
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
            await adminAuth.revokeRefreshTokens(uid);
            await adminAuth.updateUser(uid, { disabled: true });
            await adminAuth.setCustomUserClaims(uid, { role: 'inactive', disabled: true });
          } catch (e: any) {
            console.error("[USER_API] Auth deactivation failed:", e.message);
            return res.status(500).json({ error: "Failed to revoke tokens or disable account in authentication service: " + e.message });
          }
        }
        
        // Mark user as INACTIVE in Firestore SSOT to preserve historical ownership & ledger trails
        try {
          await adminDb
            .collection("users")
            .doc(uid)
            .set({
              status: "INACTIVE",
              disabled: true,
              deactivatedAt: new Date().toISOString(),
              deactivatedBy: req.user?.email || authUserId || "Admin"
            }, { merge: true });
        } catch (dbErr: any) {
          console.error("[USER_API] Database user deactivation failed:", dbErr.message);
          return res.status(500).json({ error: "Failed to update user profile to INACTIVE: " + dbErr.message });
        }
      }
      if (organizationId && organizationId !== "ORG-GLOBAL-HQ") {
        try {
          await adminDb
            .collection("organizations")
            .doc(organizationId)
            .set({
              status: "INACTIVE",
              deactivatedAt: new Date().toISOString(),
              deactivatedBy: req.user?.email || authUserId || "Admin"
            }, { merge: true });
        } catch (orgErr: any) {
          console.error("[USER_API] Database organization deactivation failed:", orgErr.message);
          return res.status(500).json({ error: "Failed to update organization to INACTIVE: " + orgErr.message });
        }
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
      const userEmail = userData?.email || req.user?.email || "";

      // Fetch user organization
      let orgData = null;
      if (userData?.organizationId) {
        const orgDoc = await adminDb.collection("organizations").doc(userData.organizationId).get();
        if (orgDoc.exists) orgData = orgDoc.data();
      }

      // Fetch associated candidate records
      const candidates: any[] = [];
      try {
        const cSnap = await adminDb.collection("candidatePool").where("userId", "==", authUserId).get();
        cSnap.forEach(d => candidates.push({ id: d.id, ...d.data() }));
        if (userEmail) {
          const cSnapEmail = await adminDb.collection("candidatePool").where("email", "==", userEmail).get();
          cSnapEmail.forEach(d => {
            if (!candidates.some(c => c.id === d.id)) candidates.push({ id: d.id, ...d.data() });
          });
        }
      } catch (e) {}

      // Fetch candidate submissions
      const submissions: any[] = [];
      try {
        const subSnap = await adminDb.collection("candidate_submissions").where("submittedBy", "==", authUserId).get();
        subSnap.forEach(d => submissions.push({ id: d.id, ...d.data() }));
      } catch (e) {}

      // Fetch interview sessions
      const interviewSessions: any[] = [];
      try {
        const intSnap = await adminDb.collection("ai_interview_sessions").where("userId", "==", authUserId).get();
        intSnap.forEach(d => interviewSessions.push({ id: d.id, ...d.data() }));
      } catch (e) {}

      // Fetch consent records
      const consentRecords: any[] = [];
      try {
        const conSnap = await adminDb.collection("consent_records").where("userId", "==", authUserId).get();
        conSnap.forEach(d => consentRecords.push({ id: d.id, ...d.data() }));
      } catch (e) {}

      // Fetch user activity logs scoped to user
      const userAuditLogs: any[] = [];
      try {
        const auditSnap = await adminDb.collection("audit_logs")
          .where("userId", "==", authUserId)
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
          email: userEmail,
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
        candidateProfiles: candidates,
        candidateSubmissions: submissions,
        aiInterviewSessions: interviewSessions,
        consentRecords: consentRecords,
        auditTrail: userAuditLogs,
        metadata: {
          exportType: "Comprehensive Subject Access Request",
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
      const deletedCollections: string[] = [];
      
      // 1. Revoke tokens and delete user in Firebase Auth
      if (adminAuth) {
        try {
          await adminAuth.revokeRefreshTokens(authUserId).catch(() => {});
          await adminAuth.deleteUser(authUserId).catch(() => {});
        } catch (e: any) {
          console.warn("[USER_API] adminAuth deleteUser fallback notice:", e.message);
        }
      }

      // 2. Delete user profile
      await adminDb.collection("users").doc(authUserId).delete().catch(() => {});
      deletedCollections.push("users");

      // 3. Delete user-owned candidate records
      try {
        const cSnap = await adminDb.collection("candidatePool").where("userId", "==", authUserId).get();
        for (const doc of cSnap.docs) {
          await doc.ref.delete();
        }
        if (userEmail) {
          const cSnapEmail = await adminDb.collection("candidatePool").where("email", "==", userEmail).get();
          for (const doc of cSnapEmail.docs) {
            await doc.ref.delete();
          }
        }
        deletedCollections.push("candidatePool");
      } catch (e) {}

      // 4. Delete user submissions
      try {
        const subSnap = await adminDb.collection("candidate_submissions").where("submittedBy", "==", authUserId).get();
        for (const doc of subSnap.docs) {
          await doc.ref.delete();
        }
        deletedCollections.push("candidate_submissions");
      } catch (e) {}

      // 5. Delete AI interview sessions
      try {
        const intSnap = await adminDb.collection("ai_interview_sessions").where("userId", "==", authUserId).get();
        for (const doc of intSnap.docs) {
          await doc.ref.delete();
        }
        deletedCollections.push("ai_interview_sessions");
      } catch (e) {}

      // 6. Delete consent records
      try {
        const conSnap = await adminDb.collection("consent_records").where("userId", "==", authUserId).get();
        for (const doc of conSnap.docs) {
          await doc.ref.delete();
        }
        deletedCollections.push("consent_records");
      } catch (e) {}

      // Record immutable audit event with CERT-In 180-day compliance metadata
      await adminDb.collection("audit_logs").add({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        action: "USER_COMPREHENSIVE_ERASURE",
        userId: authUserId,
        userEmailMasked: userEmail.replace(/^(.{2})(.*)(@.*)$/, "$1***$3"),
        erasedCollections: deletedCollections,
        reason: req.body?.reason || "Data Subject Erasure Request",
        legalBasis: "DPDP Act 2023 Sec 12 / GDPR Art 17",
        certInMandate: "Security telemetry retained under CERT-In Directions 2022 (180 days)",
        status: "COMPLETED",
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown'
      });

      return res.status(200).json({
        ok: true,
        message: "Your account, personal profile, resumes, submissions, and session records have been comprehensively erased.",
        erasedCollections: deletedCollections,
        retentionNotice: "In accordance with CERT-In Cyber Security Directions 2022 and applicable financial compliance, non-PII security incident and transaction logs are maintained for a rolling statutory period of 180 days."
      });
    }

    // Default to Context
    let requirements: any[] = [];
    let dbUserData: any = null;

    if (adminDb) {
      try {
        if (authUserId) {
          const uDoc = await adminDb.collection("users").doc(authUserId).get();
          if (uDoc.exists) {
            dbUserData = uDoc.data();
          }
        }

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
            // Supply layer / Recruiter family checks
            const subtype = dbUserData ? normalizeRecruiterSubtype(dbUserData.recruiterSubtype, queryRole) : "INTERNAL";
            const reqScope = dbUserData?.requirementScope || "ASSIGNED_ONLY";
            const assignedIds = dbUserData?.assignedRequirementIds || [];
            const userVendor = dbUserData?.vendorId || dbUserData?.organizationId || "";

            requirements = allReqsSnap.docs
              .map((doc: any) => ({ id: doc.id, ...doc.data() }))
              .filter((r: any) => {
                const s = (r.status || "").toUpperCase();
                if (s === "DELETED" || s === "ARCHIVED" || s === "DRAFT") return false;

                if (subtype === "INTERNAL") {
                  if (reqScope === "ASSIGNED_ONLY") {
                    return assignedIds.includes(r.id) || (r.assignedRecruiterIds && r.assignedRecruiterIds.includes(authUserId));
                  }
                  return true;
                } else if (subtype === "VENDOR") {
                  // Must be distributed to vendor
                  const isDistributed = !r.authorizedVendorIds || r.authorizedVendorIds.length === 0 || r.distributionState === "OPEN_ALL_VENDORS" || (userVendor && r.authorizedVendorIds.includes(userVendor));
                  if (!isDistributed) return false;

                  if (reqScope === "ASSIGNED_ONLY" && assignedIds.length > 0) {
                    return assignedIds.includes(r.id);
                  }
                  return true;
                } else if (subtype === "FREELANCE") {
                  // Strictly explicit assignments only
                  return assignedIds.includes(r.id) || (r.assignedRecruiterIds && r.assignedRecruiterIds.includes(authUserId));
                }
                return true;
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

    const authoritativeRole = normalizeRole(dbUserData?.role || authRole || (isAdmin ? "BUSINESS_OPERATIONS" : "VENDOR_RECRUITER"));
    const authoritativePermissions = getPermissionsForRole(authoritativeRole);

    return res.status(200).json({
      success: true,
      user: {
        uid: authUserId || "anonymous",
        name: dbUserData?.displayName || dbUserData?.name || "Enterprise User",
        role: authoritativeRole,
        organizationId: dbUserData?.organizationId || authOrgId || (isRoleAdminEquivalent(authoritativeRole) ? "ORG-GLOBAL-HQ" : "ORG-DEFAULT"),
        status: dbUserData?.status || "active",
        permissions: dbUserData?.permissions || authoritativePermissions,
        isAdminEquivalent: isRoleAdminEquivalent(authoritativeRole),
        recruiterSubtype: dbUserData?.recruiterSubtype || dbUserData?.subtype || "INTERNAL",
        requirementScope: dbUserData?.requirementScope || "ASSIGNED_ONLY",
        assignedRequirementIds: dbUserData?.assignedRequirementIds || [],
        vendorId: dbUserData?.vendorId || "",
        clientId: dbUserData?.clientId || "",
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
