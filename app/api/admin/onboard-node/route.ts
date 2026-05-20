import { getAdminApp } from "@/src/server/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, message: "Onboarding endpoint active" });
}

export async function POST(req: Request) {
  try {
    const { email, password, role, companyName } = await req.json();
    
    if (!email || !password || !role || !companyName) {
      return Response.json({ error: "VALIDATION_FAILED: All node parameters (email, password, role, companyName) are required." }, { status: 400 });
    }

    const app = getAdminApp();
    const auth = app.auth();
    const db = app.firestore();

    // 1. Create/Get Auth User
    let uid: string;
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    } catch (authErr: any) {
      if (authErr.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email,
          password,
          displayName: companyName
        });
        uid = newUser.uid;
      } else {
        throw authErr;
      }
    }

    const orgId = "NODE-" + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    // 2. Organization Record
    let orgType = "client";
    if (role === "admin") orgType = "admin";
    else if (role?.includes("vendor") || role?.includes("recruiter")) {
      orgType = "vendor";
    }

    await db.runTransaction(async (transaction) => {
      const orgRef = db.collection("organizations").doc(orgId);
      const userRef = db.collection("users").doc(uid);

      transaction.set(orgRef, {
        organizationId: orgId,
        type: orgType,
        companyName,
        status: "approved",
        adminApproved: true,
        ownerId: uid,
        createdAt: new Date().toISOString()
      });

      transaction.set(userRef, {
        uid,
        email,
        role: role.toUpperCase(),
        organizationId: orgId,
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      });
    });

    // 3. Assign Custom Claims
    try {
      await auth.setCustomUserClaims(uid, {
        role: role.toLowerCase(),
        organizationId: orgId
      });
    } catch (claimErr) {
      console.warn("[ONBOARD] Custom claims failed:", claimErr);
    }

    return Response.json({ ok: true, uid, orgId });
  } catch (err: any) {
    console.error("[ONBOARD ERROR]", err);
    return Response.json({
      ok: false,
      error: "ONBOARD_FAILURE",
      message: err.message
    }, { status: 500 });
  }
}
