export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  try {
    const { getAdminApp } = await import("../../src/server/firebase-admin");
    const app = getAdminApp();
    const db = app.firestore();
    
    // Controlled, non-crashing data retrieval for the dashboard
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

    return res.status(200).json({
      ok: true,
      users,
      organizations,
      candidatePool,
      dealRooms,
      requirements_public,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[GOVERNANCE STANDALONE FATAL]", err);
    return res.status(500).json({
      ok: false,
      error: "GOVERNANCE_SYNC_FAILURE",
      message: err.message
    });
  }
}
