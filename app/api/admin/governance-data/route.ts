import { getAdminApp } from "@/src/server/firebase-admin.ts";

export const runtime = "nodejs";

export async function GET() {
  try {
    const app = getAdminApp();
    const db = app.firestore();
    
    const [usersSnap, orgsSnap, candSnap, roomsSnap, reqsSnap] = await Promise.all([
      db.collection("users").limit(50).get().catch(() => ({ docs: [] })),
      db.collection("organizations").limit(50).get().catch(() => ({ docs: [] })),
      db.collection("candidates").limit(50).get().catch(() => ({ docs: [] })),
      db.collection("deal_rooms").limit(50).get().catch(() => ({ docs: [] })),
      db.collection("requirements").limit(50).get().catch(() => ({ docs: [] }))
    ]);

    const users = usersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const organizations = orgsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const candidatePool = candSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const dealRooms = roomsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const requirements_public = reqsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    return Response.json({
      ok: true,
      users,
      organizations,
      candidatePool,
      dealRooms,
      requirements_public,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return Response.json({
      ok: false,
      error: "GOVERNANCE_SYNC_FAILURE",
      message: err.message
    }, { status: 500 });
  }
}
