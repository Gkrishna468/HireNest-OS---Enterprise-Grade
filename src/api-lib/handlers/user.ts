import { adminDb, adminAuth } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  // Extract action from path or query
  const rawPath = req.path || req.url || '';
  const action = req.body?.action || req.query?.action || (rawPath.includes('create') ? 'create' : (rawPath.includes('delete') ? 'delete' : (rawPath.includes('assign') ? 'assign' : (rawPath.includes('finalize-onboarding') ? 'finalize-onboarding' : 'context'))));

  console.log(`[USER_API] Action: ${action} Method: ${req.method} Path: ${rawPath}`);

  try {
    if (action === 'finalize-onboarding') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { orgId, orgType, companyName, userProfile } = req.body;
      if (!adminDb || !adminAuth) return res.status(400).json({ error: "Authority node not initialized" });
      
      console.log(`[USER_API] Finalize Onboarding for UI: ${userProfile.uid} in Org: ${orgId}`);
      await adminDb.collection("organizations").doc(orgId).set({
        id: orgId, organizationId: orgId, type: orgType, companyName, status: 'ACTIVE', createdAt: new Date().toISOString()
      }, { merge: true });
      
      await adminDb.collection("users").doc(userProfile.uid).set(userProfile, { merge: true });
      await adminAuth.setCustomUserClaims(userProfile.uid, { role: userProfile.role, orgId: orgId });
      
      return res.status(200).json({ ok: true });
    }

    if (action === 'create') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { email, password, role, companyName } = req.body;
      console.log(`[USER_API] Creating user: ${email} with role: ${role}`);
      
      if (!adminDb || !adminAuth) {
        return res.status(400).json({ error: "Authority node not initialized (missing Firebase Admin credentials on the backend)" });
      }
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      let orgType = 'client';
      if (role.includes('vendor')) orgType = 'vendor';
      else if (role.includes('recruiter')) orgType = 'recruiter';
      else if (role.includes('independent')) orgType = 'independent';

      const orgId = "ORG-" + Math.random().toString(36).substr(2, 9);
      await adminDb.collection("organizations").doc(orgId).set({
        id: orgId, organizationId: orgId, companyName: companyName || "New Entity", type: orgType, status: 'ACTIVE', createdAt: new Date().toISOString()
      });

      const user = await adminAuth.createUser({ email, password, displayName: companyName });
      await adminDb.collection("users").doc(user.uid).set({
        uid: user.uid, email, role: role || 'client_admin', organizationId: orgId, status: 'ACTIVE', onboardingCompleted: true, createdAt: new Date().toISOString()
      });
      await adminAuth.setCustomUserClaims(user.uid, { role: role || 'client_admin', orgId: orgId });
      return res.status(200).json({ ok: true, uid: user.uid });
    }

    if (action === 'delete') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { uid, organizationId } = req.body;
      if (!adminDb || !adminAuth) {
        return res.status(400).json({ error: "Authority node not initialized (missing Firebase Admin credentials on the backend)" });
      }
      if (uid) {
        await adminAuth.deleteUser(uid).catch(() => {});
        await adminDb.collection("users").doc(uid).delete().catch(() => {});
      }
      if (organizationId) {
        await adminDb.collection("organizations").doc(organizationId).delete().catch(() => {});
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'assign') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { uid, role, organizationId } = req.body;
      if (!adminDb || !adminAuth) {
        return res.status(400).json({ error: "Authority node not initialized (missing Firebase Admin credentials on the backend)" });
      }
      await adminAuth.setCustomUserClaims(uid, { role, orgId: organizationId });
      return res.status(200).json({ ok: true, message: "Custom claims updated." });
    }

    // Default to Context
    let requirements: any[] = [];
    if (adminDb) {
      try {
        const queryOrgId = req.query.orgId || req.body.orgId;
        const queryRole = req.query.role || req.body.role;
        if (queryOrgId) {
          console.log(`[USER_API] Fetching proxy requirements for orgId: ${queryOrgId} under role: ${queryRole}`);
          let requirementsSnap;
          if (queryRole === 'admin' || queryRole === 'super_admin' || queryRole === 'ops_admin') {
            requirementsSnap = await adminDb.collection("requirements_public").get();
          } else if (queryRole === 'vendor' || queryRole?.includes('vendor') || queryRole?.includes('recruiter') || queryRole?.includes('independent')) {
            requirementsSnap = await adminDb.collection("requirements_public")
              .where("visibility", "==", "VENDOR_NETWORK")
              .where("status", "==", "PUBLISHED")
              .get();
          } else {
            requirementsSnap = await adminDb.collection("requirements_public")
              .where("clientId", "==", queryOrgId)
              .get();
          }
          if (requirementsSnap && requirementsSnap.docs) {
            requirements = requirementsSnap.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt ? (typeof doc.data().createdAt.toDate === 'function' ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt) : null
            }));
          }
        }
      } catch (dbErr) {
        console.warn("[USER_API] Proxy requirements fetch failed or bypassed:", dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        uid: "system-init-user", 
        name: "Enterprise Admin", 
        email: "admin@hirenestworkforce.com", 
        role: req.query.role || req.body.role || "super_admin", 
        organizationId: req.query.orgId || req.body.orgId || "ORG-GLOBAL-HQ", 
        status: "active",
        permissions: ["manage_users", "manage_requirements", "view_diagnostics", "execute_governance", "manage_vendors", "manage_clients"]
      },
      requirements,
      environment: "production", 
      platformStatus: "stable"
    });

  } catch (err: any) {
    console.error(`[USER_API_CRITICAL_ERR] error during execution:`, err);
    res.status(500).json({ 
      error: err.message || "Internal Server Error", 
      stack: err.stack,
      telemetry: "API_USER_FAIL_SAFE_DUMP"
    });
  }
}
