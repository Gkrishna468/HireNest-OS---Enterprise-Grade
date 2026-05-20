import { adminDb, adminAuth } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password, role, companyName } = req.body;
    
    // 1. Create Organization
    let orgType = 'client';
    if (role.includes('vendor')) orgType = 'vendor';
    else if (role.includes('recruiter')) orgType = 'recruiter';
    else if (role.includes('independent')) orgType = 'independent';

    const orgId = "ORG-" + Math.random().toString(36).substr(2, 9);
    await adminDb.collection("organizations").doc(orgId).set({
      id: orgId,
      organizationId: orgId,
      companyName: companyName || "New Entity",
      type: orgType,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });

    // 2. Create Auth User
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: companyName
    });

    // 3. Create Firestore User
    await adminDb.collection("users").doc(user.uid).set({
      uid: user.uid,
      email,
      role: role || 'client_admin',
      organizationId: orgId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });

    // 4. Set Custom Claims
    await adminAuth.setCustomUserClaims(user.uid, {
      role: role || 'client_admin',
      orgId: orgId
    });

    res.status(200).json({ ok: true, uid: user.uid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
