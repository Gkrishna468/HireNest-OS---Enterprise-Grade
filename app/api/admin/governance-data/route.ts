import { getAdminApp } from "@/src/server/firebase-admin.ts";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("[GOV] STEP 1: Booting Governance Context");
    const app = getAdminApp();
    const db = app.firestore();
    
    console.log("[GOV] STEP 2: Executing Distributed Retrieval");
    const [usersSnap, orgsSnap, candSnap, roomsSnap, reqsSnap] = await Promise.all([
      db.collection("users").limit(50).get().catch((e) => { console.warn("[GOV] Users poll failed:", e.message); return { docs: [] }; }),
      db.collection("organizations").limit(50).get().catch((e) => { console.warn("[GOV] Orgs poll failed:", e.message); return { docs: [] }; }),
      db.collection("candidates").limit(50).get().catch((e) => { console.warn("[GOV] Candidates poll failed:", e.message); return { docs: [] }; }),
      db.collection("deal_rooms").limit(50).get().catch((e) => { console.warn("[GOV] DealRooms poll failed:", e.message); return { docs: [] }; }),
      db.collection("requirements").limit(50).get().catch((e) => { console.warn("[GOV] ReqPublic poll failed:", e.message); return { docs: [] }; })
    ]);

    console.log("[GOV] STEP 3: Mapping Entity Mirrors");
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
    console.error("[GOV] FATAL GOVERNANCE SYNC FAILURE:", err);
    return Response.json({
      ok: false,
      error: "GOVERNANCE_SYNC_FAILURE",
      message: err.message
    }, { status: 500 });
  }
}

