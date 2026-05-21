import { adminDb, adminAuth } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  // Extract action from path or query
  const rawPath = req.path || req.url || '';
  const action = req.body?.action || req.query?.action || (rawPath.includes('create') ? 'create' : (rawPath.includes('delete') ? 'delete' : (rawPath.includes('assign') ? 'assign' : 'context')));

  console.log(`[USER_API] Action: ${action} Method: ${req.method} Path: ${rawPath}`);

  try {
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
    return res.status(200).json({
      success: true,
      user: {
        uid: "system-init-user", name: "Enterprise Admin", email: "admin@hirenestworkforce.com", role: "super_admin", organizationId: "ORG-GLOBAL-HQ", status: "active",
        permissions: ["manage_users", "manage_requirements", "view_diagnostics", "execute_governance", "manage_vendors", "manage_clients"]
      },
      environment: "production", platformStatus: "stable"
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
