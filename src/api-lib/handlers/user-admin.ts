import { adminDb, adminAuth } from "../../lib/firebase-admin.js";
import {
  AUTHORITATIVE_ROLES,
  ROLE_CATALOG,
  RECRUITER_SUBTYPES,
  getPermissionsForRole,
  isRoleAdminEquivalent,
  normalizeRole,
  normalizeRecruiterSubtype,
  getUserTypeForRole,
  canActorAssignRole,
  SystemRole,
  UserType,
  RecruiterSubtype,
  RequirementScopeType,
} from "../../lib/rbac.js";

export default async function userAdminHandler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  try {
    const actorUid = req.user?.uid;
    const actorEmail = req.user?.email || "Unknown";
    const actorRole = normalizeRole(req.user?.role);
    const actorOrgId = req.user?.organizationId || req.user?.orgId;
    const isActorAdmin = isRoleAdminEquivalent(actorRole);

    const path = req.path || req.url || "";
    const action = req.query?.action || req.body?.action || (
      path.includes("create-user") ? "create" :
      path.includes("reactivate-user") ? "reactivate" :
      path.includes("delete-user") || path.includes("deactivate-user") ? "deactivate" :
      path.includes("assign-role") ? "assign" :
      path.includes("roles") ? "roles" :
      "list"
    );

    // 1. Get Authoritative Roles Catalog & Recruiter Subtypes
    if (action === "roles") {
      return res.status(200).json({
        ok: true,
        roles: AUTHORITATIVE_ROLES,
        recruiterSubtypes: RECRUITER_SUBTYPES,
      });
    }

    // 2. List Users with Authority Filtering
    if (req.method === "GET" || action === "list") {
      if (!adminDb) {
        return res.status(503).json({ error: "Database authority not initialized" });
      }

      let usersQuery: any = adminDb.collection("users");
      if (!isActorAdmin) {
        if (actorRole === "VENDOR_ADMIN" && actorOrgId) {
          // Vendor Admin can only view users under their own vendor organization
          usersQuery = usersQuery.where("organizationId", "==", actorOrgId);
        } else if (actorRole === "CLIENT_ADMIN" && actorOrgId) {
          usersQuery = usersQuery.where("organizationId", "==", actorOrgId);
        } else {
          // General non-admin can only see their own profile
          usersQuery = usersQuery.where("uid", "==", actorUid);
        }
      }

      const snapshot = await usersQuery.limit(200).get();
      const users: any[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        const roleNorm = normalizeRole(data.role);
        const roleDef = ROLE_CATALOG[roleNorm];
        const derivedUserType = (data.userType as UserType) || getUserTypeForRole(roleNorm);
        const derivedSubtype = (derivedUserType === "RECRUITER" || roleNorm === "RECRUITER" || roleNorm === "VENDOR_RECRUITER")
          ? normalizeRecruiterSubtype(data.recruiterSubtype || data.subtype, roleNorm)
          : undefined;

        users.push({
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || "",
          phone: data.phone || "",
          displayName: data.displayName || data.name || data.email?.split("@")[0] || "User",
          userType: derivedUserType,
          role: roleNorm,
          recruiterSubtype: derivedSubtype,
          subtype: derivedSubtype,
          requirementScope: (data.requirementScope as RequirementScopeType) || (derivedSubtype === "FREELANCE" ? "EXPLICIT_ONLY" : "ASSIGNED_ONLY"),
          assignedRequirementIds: data.assignedRequirementIds || [],
          roleDisplayName: roleDef?.displayName || roleNorm,
          category: roleDef?.category || "GOVERNANCE",
          isAdminEquivalent: roleDef?.isAdminEquivalent || false,
          permissions: data.permissions || getPermissionsForRole(roleNorm),
          organizationId: data.organizationId || data.orgId || "",
          vendorId: data.vendorId || (derivedSubtype === "VENDOR" ? data.organizationId : undefined),
          managedByVendorId: data.managedByVendorId || data.vendorId || "",
          status: data.status || (data.disabled ? "INACTIVE" : "ACTIVE"),
          disabled: data.disabled || data.status === "INACTIVE",
          createdByUserId: data.createdByUserId || "",
          createdByEmail: data.createdByEmail || "",
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
          deactivatedAt: data.deactivatedAt || "",
          deactivatedBy: data.deactivatedBy || "",
        });
      });

      return res.status(200).json({ ok: true, users });
    }

    // 3. Create User with Attribution & Hierarchy Enforcement
    if (action === "create" || path.includes("create-user")) {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const {
        email,
        password,
        phone,
        userType: rawUserType,
        role: rawRole,
        recruiterSubtype: rawSubtype,
        requirementScope: rawScope,
        assignedRequirementIds = [],
        organizationId,
        vendorId,
        companyName,
        displayName,
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const targetRole = normalizeRole(rawRole);
      const isTargetAdmin = isRoleAdminEquivalent(targetRole);
      const targetUserType: UserType = (rawUserType as UserType) || getUserTypeForRole(targetRole);
      const targetSubtype: RecruiterSubtype | undefined =
        targetUserType === "RECRUITER" || targetRole === "RECRUITER" || targetRole === "VENDOR_RECRUITER"
          ? normalizeRecruiterSubtype(rawSubtype, rawRole)
          : undefined;

      // Verify permission to create this role
      if (targetRole === "PLATFORM_AUTHORITY" && actorRole !== "PLATFORM_AUTHORITY") {
        return res.status(403).json({ error: "Cannot create or configure a Platform Authority user without Platform Authority privileges." });
      }

      if (!isActorAdmin) {
        if (actorRole === "VENDOR_ADMIN") {
          if (targetRole !== "RECRUITER" && targetRole !== "VENDOR_RECRUITER") {
            return res.status(403).json({ error: "Vendor Admins can only create Recruiter seats for their vendor." });
          }
          if (targetSubtype && targetSubtype !== "VENDOR") {
            return res.status(403).json({ error: "Vendor Admins can only create Vendor Recruiter subtypes." });
          }
        } else {
          return res.status(403).json({ error: "Insufficient privileges to create user." });
        }
      }

      if (isTargetAdmin && !isActorAdmin) {
        return res.status(403).json({ error: "Cannot create an Admin-Equivalent user without Platform Authority." });
      }

      if (!adminDb) {
        return res.status(503).json({ error: "Database authority not initialized" });
      }

      // Hierarchy validation
      let targetOrgId = organizationId || "";
      let targetVendorId = vendorId || "";

      if (targetUserType === "RECRUITER" || targetRole === "RECRUITER" || targetRole === "VENDOR_RECRUITER") {
        if (targetSubtype === "VENDOR") {
          if (actorRole === "VENDOR_ADMIN") {
            targetOrgId = actorOrgId;
            targetVendorId = actorOrgId;
          } else {
            targetVendorId = vendorId || organizationId;
            targetOrgId = targetVendorId;
          }

          if (!targetVendorId) {
            return res.status(400).json({
              error: "Vendor Recruiter must be assigned to a valid Vendor Organization (vendorId required).",
            });
          }
        } else if (targetSubtype === "INTERNAL") {
          targetOrgId = "ORG-GLOBAL-HQ";
          targetVendorId = "";
        } else if (targetSubtype === "FREELANCE") {
          targetOrgId = organizationId || "ORG-FREELANCE-NETWORK";
          targetVendorId = "";
        }
      } else if (isTargetAdmin) {
        targetOrgId = "ORG-GLOBAL-HQ";
      } else if (!targetOrgId) {
        targetOrgId = "ORG-" + Math.random().toString(36).substr(2, 9);
      }

      // Ensure Organization exists in Firestore SSOT
      if (targetOrgId) {
        const orgDoc = await adminDb.collection("organizations").doc(targetOrgId).get();
        if (!orgDoc.exists) {
          let orgType = "client";
          if (targetRole === "VENDOR_ADMIN" || targetSubtype === "VENDOR") orgType = "vendor";
          else if (isTargetAdmin || targetSubtype === "INTERNAL") orgType = "hq";
          else if (targetSubtype === "FREELANCE") orgType = "freelance";

          await adminDb.collection("organizations").doc(targetOrgId).set({
            id: targetOrgId,
            organizationId: targetOrgId,
            companyName: companyName || (orgType === "hq" ? "HireNest Workforce HQ" : orgType === "freelance" ? "HireNest Freelance Network" : "Organization"),
            type: orgType,
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      const permissions = getPermissionsForRole(targetRole);
      let createdUid = "";

      // Create in Firebase Auth if available
      if (adminAuth && password) {
        try {
          const userRec = await adminAuth.createUser({
            email,
            password,
            displayName: displayName || companyName || email.split("@")[0],
          });
          createdUid = userRec.uid;
          try {
            await adminAuth.setCustomUserClaims(userRec.uid, {
              userType: targetUserType,
              role: targetRole,
              recruiterSubtype: targetSubtype || undefined,
              organizationId: targetOrgId,
              orgId: targetOrgId,
              vendorId: targetVendorId || undefined,
              requirementScope: rawScope || (targetSubtype === "FREELANCE" ? "EXPLICIT_ONLY" : "ASSIGNED_ONLY"),
            });
          } catch (claimsErr: any) {
            console.warn("[UserAdmin] Custom claims notice:", claimsErr.message);
          }
        } catch (authErr: any) {
          console.warn("[UserAdmin] adminAuth.createUser fallback:", authErr.message);
        }
      }

      if (!createdUid) {
        const cleanEmailKey = email.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        createdUid = `usr_${cleanEmailKey.substring(0, 24)}_${Math.random().toString(36).substr(2, 6)}`;
      }

      const nowIso = new Date().toISOString();
      const userData: any = {
        uid: createdUid,
        id: createdUid,
        email,
        phone: phone || "",
        displayName: displayName || companyName || email.split("@")[0],
        userType: targetUserType,
        role: targetRole,
        recruiterSubtype: targetSubtype || undefined,
        subtype: targetSubtype || undefined,
        requirementScope: rawScope || (targetSubtype === "FREELANCE" ? "EXPLICIT_ONLY" : "ASSIGNED_ONLY"),
        assignedRequirementIds: Array.isArray(assignedRequirementIds) ? assignedRequirementIds : [],
        permissions,
        organizationId: targetOrgId,
        orgId: targetOrgId,
        status: "ACTIVE",
        disabled: false,
        onboardingCompleted: true,
        createdByUserId: actorUid || "system",
        createdByEmail: actorEmail,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (targetSubtype === "VENDOR" || targetRole === "VENDOR_ADMIN") {
        userData.vendorId = targetVendorId;
        userData.managedByVendorId = targetVendorId;
      }

      await adminDb.collection("users").doc(createdUid).set(userData, { merge: true });

      // Immutable Audit Log
      await adminDb.collection("audit_logs").add({
        date: nowIso,
        timestamp: Date.now(),
        actorId: actorUid,
        actorEmail,
        targetUserId: createdUid,
        targetUserEmail: email,
        targetUserType: targetUserType,
        targetRole,
        targetRecruiterSubtype: targetSubtype || null,
        organizationId: targetOrgId,
        action: "USER_CREATED",
        reason: `User created with role ${targetRole} and userType ${targetUserType}`,
        status: "SUCCESS",
        correlationId: `USR-CRT-${Date.now()}`,
      });

      return res.status(200).json({
        ok: true,
        uid: createdUid,
        user: userData,
        message: "User created and permissions assigned successfully.",
      });
    }

    // 4. Assign Role & Authoritative Permissions
    if (action === "assign" || path.includes("assign-role")) {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const {
        uid,
        userType: rawUserType,
        role: rawRole,
        recruiterSubtype: rawSubtype,
        requirementScope: rawScope,
        assignedRequirementIds,
        organizationId,
        vendorId,
        phone,
      } = req.body;

      if (!uid || (!rawRole && !rawUserType)) {
        return res.status(400).json({ error: "User ID (uid) and role or userType are required." });
      }

      const targetRole = normalizeRole(rawRole);
      if (!canActorAssignRole(actorRole, targetRole)) {
        return res.status(403).json({ error: "Access Denied: Cannot assign this role with current privileges." });
      }

      if (!adminDb) {
        return res.status(503).json({ error: "Database authority not initialized" });
      }

      const targetUserDoc = await adminDb.collection("users").doc(uid).get();
      if (!targetUserDoc.exists) {
        return res.status(404).json({ error: "User not found in system SSOT." });
      }
      const existingData = targetUserDoc.data() || {};

      const targetUserType: UserType = (rawUserType as UserType) || getUserTypeForRole(targetRole);
      const targetSubtype: RecruiterSubtype | undefined =
        targetUserType === "RECRUITER" || targetRole === "RECRUITER" || targetRole === "VENDOR_RECRUITER"
          ? normalizeRecruiterSubtype(rawSubtype || existingData.recruiterSubtype || existingData.subtype, rawRole)
          : undefined;

      let targetOrgId = organizationId || existingData.organizationId || "";
      let targetVendorId = vendorId || existingData.vendorId || "";

      if (targetUserType === "RECRUITER" || targetRole === "RECRUITER" || targetRole === "VENDOR_RECRUITER") {
        if (targetSubtype === "VENDOR") {
          targetVendorId = vendorId || organizationId || existingData.vendorId || existingData.organizationId;
          targetOrgId = targetVendorId;
          if (!targetVendorId) {
            return res.status(400).json({
              error: "Vendor Recruiter must be mapped to a valid Vendor Organization (vendorId required).",
            });
          }
        } else if (targetSubtype === "INTERNAL") {
          targetOrgId = "ORG-GLOBAL-HQ";
          targetVendorId = "";
        } else if (targetSubtype === "FREELANCE") {
          targetOrgId = organizationId || existingData.organizationId || "ORG-FREELANCE-NETWORK";
          targetVendorId = "";
        }
      }

      const newPermissions = getPermissionsForRole(targetRole);
      const nowIso = new Date().toISOString();

      const updates: any = {
        userType: targetUserType,
        role: targetRole,
        recruiterSubtype: targetSubtype || null,
        subtype: targetSubtype || null,
        requirementScope: rawScope || existingData.requirementScope || (targetSubtype === "FREELANCE" ? "EXPLICIT_ONLY" : "ASSIGNED_ONLY"),
        permissions: newPermissions,
        organizationId: targetOrgId,
        orgId: targetOrgId,
        updatedAt: nowIso,
        updatedBy: actorEmail,
      };

      if (phone !== undefined) updates.phone = phone;
      if (Array.isArray(assignedRequirementIds)) {
        updates.assignedRequirementIds = assignedRequirementIds;
      }

      if (targetSubtype === "VENDOR" || targetRole === "VENDOR_ADMIN") {
        updates.vendorId = targetVendorId;
        updates.managedByVendorId = targetVendorId;
      } else {
        updates.vendorId = null;
        updates.managedByVendorId = null;
      }

      await adminDb.collection("users").doc(uid).set(updates, { merge: true });

      if (adminAuth) {
        try {
          await adminAuth.setCustomUserClaims(uid, {
            userType: targetUserType,
            role: targetRole,
            recruiterSubtype: targetSubtype || undefined,
            organizationId: targetOrgId,
            orgId: targetOrgId,
            vendorId: targetVendorId || undefined,
            requirementScope: updates.requirementScope,
          });
        } catch (claimsErr: any) {
          console.warn("[UserAdmin] adminAuth.setCustomUserClaims notice:", claimsErr.message);
        }
      }

      // Record Audit Log
      await adminDb.collection("audit_logs").add({
        date: nowIso,
        timestamp: Date.now(),
        actorId: actorUid,
        actorEmail,
        targetUserId: uid,
        targetUserEmail: existingData.email || "Unknown",
        previousRole: existingData.role,
        newRole: targetRole,
        newRecruiterSubtype: targetSubtype || null,
        action: "ROLE_UPDATED",
        status: "SUCCESS",
        correlationId: `ROLE-UPD-${Date.now()}`,
      });

      return res.status(200).json({
        ok: true,
        message: `Role updated to ${targetRole} (${targetSubtype || targetUserType}) and authoritative permissions applied.`,
        role: targetRole,
        userType: targetUserType,
        recruiterSubtype: targetSubtype,
        permissions: newPermissions,
      });
    }

    // 5. Deactivate User & Revoke Access (Preserve Historical Records SSOT)
    if (action === "deactivate" || action === "delete" || path.includes("delete-user") || path.includes("deactivate-user")) {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ error: "User ID (uid) is required for deactivation." });
      }

      if (uid === actorUid) {
        return res.status(400).json({ error: "You cannot deactivate your own active session." });
      }

      if (!adminDb) {
        return res.status(503).json({ error: "Database authority not initialized" });
      }

      const targetDoc = await adminDb.collection("users").doc(uid).get();
      if (!targetDoc.exists) {
        return res.status(404).json({ error: "User not found." });
      }
      const targetData = targetDoc.data() || {};
      const targetRole = normalizeRole(targetData.role);

      // Authority checks:
      // Admin can deactivate anyone except themselves
      // Vendor Admin can deactivate Vendor Recruiters under their own vendor
      // Creator can deactivate users they created
      const isCreator = targetData.createdByUserId === actorUid;
      const isVendorAdminOfRecruiter =
        actorRole === "VENDOR_ADMIN" &&
        (targetRole === "VENDOR_RECRUITER" || targetRole === "RECRUITER") &&
        (targetData.vendorId === actorOrgId || targetData.organizationId === actorOrgId);

      if (!isActorAdmin && !isCreator && !isVendorAdminOfRecruiter) {
        return res.status(403).json({ error: "Insufficient privileges to deactivate this user." });
      }

      const nowIso = new Date().toISOString();

      // Revoke tokens & disable Firebase Auth identity
      if (adminAuth && uid) {
        try {
          await adminAuth.revokeRefreshTokens(uid).catch(() => {});
          await adminAuth.updateUser(uid, { disabled: true }).catch(() => {});
        } catch (authErr: any) {
          console.warn("[UserAdmin] Auth disable notice:", authErr.message);
        }
      }

      // Update Firestore SSOT status to INACTIVE - PRESERVING all historical documents
      await adminDb.collection("users").doc(uid).set({
        status: "INACTIVE",
        disabled: true,
        deactivatedAt: nowIso,
        deactivatedBy: actorEmail,
        updatedAt: nowIso,
      }, { merge: true });

      // Immutable Audit Log
      await adminDb.collection("audit_logs").add({
        date: nowIso,
        timestamp: Date.now(),
        actorId: actorUid,
        actorEmail,
        targetUserId: uid,
        targetUserEmail: targetData.email || "Unknown",
        role: targetRole,
        action: "USER_DEACTIVATED",
        reason: "User access revoked and deactivated. All historical candidate, requirement, and submission records preserved.",
        status: "SUCCESS",
        correlationId: `DEACT-${Date.now()}`,
      });

      return res.status(200).json({
        ok: true,
        message: "User identity deactivated and access revoked. Historical business records and ledger trails preserved.",
      });
    }

    // 6. Reactivate User & Restore Access
    if (action === "reactivate" || path.includes("reactivate-user")) {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ error: "User ID (uid) is required for reactivation." });
      }

      if (!adminDb) {
        return res.status(503).json({ error: "Database authority not initialized" });
      }

      const targetDoc = await adminDb.collection("users").doc(uid).get();
      if (!targetDoc.exists) {
        return res.status(404).json({ error: "User not found." });
      }
      const targetData = targetDoc.data() || {};
      const targetRole = normalizeRole(targetData.role);

      // Authority checks:
      // PLATFORM_AUTHORITY can reactivate users
      if (!isActorAdmin) {
        return res.status(403).json({ error: "Insufficient privileges to reactivate this user." });
      }

      const nowIso = new Date().toISOString();

      // Enable Firebase Auth identity
      if (adminAuth && uid) {
        try {
          await adminAuth.updateUser(uid, { disabled: false }).catch(() => {});
        } catch (authErr: any) {
          console.warn("[UserAdmin] Auth enable notice:", authErr.message);
        }
      }

      // Update Firestore SSOT status to ACTIVE
      await adminDb.collection("users").doc(uid).set({
        status: "ACTIVE",
        disabled: false,
        reactivatedAt: nowIso,
        reactivatedBy: actorEmail,
        updatedAt: nowIso,
      }, { merge: true });

      // Immutable Audit Log
      await adminDb.collection("audit_logs").add({
        date: nowIso,
        timestamp: Date.now(),
        actorId: actorUid,
        actorEmail,
        targetUserId: uid,
        targetUserEmail: targetData.email || "Unknown",
        role: targetRole,
        action: "USER_REACTIVATED",
        reason: "User access restored and activated.",
        status: "SUCCESS",
        correlationId: `REACT-${Date.now()}`,
      });

      return res.status(200).json({
        ok: true,
        message: "User identity reactivated and access restored.",
      });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error("[USER_ADMIN_CRITICAL_ERR]", err);
    return res.status(500).json({ error: err.message || "Internal server error in user admin" });
  }
}

