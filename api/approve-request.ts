import { adminDb, adminAuth } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { requestId, role } = req.body;
    if (!requestId) throw new Error("Request ID is required");

    // Get the request
    const requestDoc = await adminDb.collection("onboarding_requests").doc(requestId).get();
    if (!requestDoc.exists) throw new Error("Request not found");

    const requestData = requestDoc.data();
    
    // Create the organization
    let orgType = 'client';
    if (role.includes('vendor')) orgType = 'vendor';
    else if (role.includes('recruiter')) orgType = 'recruiter';
    else if (role.includes('independent')) orgType = 'independent';

    const orgId = "ORG-" + Math.random().toString(36).substr(2, 9);
    await adminDb.collection("organizations").doc(orgId).set({
      id: orgId,
      organizationId: orgId,
      companyName: requestData?.companyName || "New Organization",
      type: orgType,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });

    // Create the user in Auth
    const userRole = role || (requestData?.type === 'vendor' ? 'vendor_admin' : 'client_admin');
    const userRecord = await adminAuth.createUser({
      email: requestData?.email,
      password: "DefaultPassword123!", // Should be changed or handled better
      displayName: requestData?.companyName
    });

    // Create user in Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: requestData?.email,
      role: userRole,
      organizationId: orgId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });

    // Update request status
    await adminDb.collection("onboarding_requests").doc(requestId).update({
      verificationStatus: 'VERIFIED',
      approvedAt: new Date().toISOString()
    });

    res.status(200).json({ ok: true, message: "Onboarding approved and provisioned." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
