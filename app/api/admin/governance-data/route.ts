import { getAdminApp } from "@/src/server/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("[GOV] STEP 1: Booting Governance Context");
    const app = getAdminApp();
    const db = app.firestore();
    
    console.log("[GOV] STEP 2: Executing Distributed Retrieval (Fault-Tolerant)");
    const collections = ["users", "organizations", "candidates", "deal_rooms", "requirements"];
    
    const results = await Promise.allSettled(
      collections.map(col => db.collection(col).limit(50).get())
    );

    const data: any = {};
    results.forEach((result, index) => {
      const colName = collections[index];
      if (result.status === "fulfilled") {
        data[colName] = result.value.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      } else {
        console.warn(`[GOV] Partial failure for ${colName}:`, result.reason.message);
        data[colName] = [];
      }
    });

    console.log("[GOV] STEP 3: Finalizing Sync");
    return Response.json({
      ok: true,
      ...data,
      candidatePool: data.candidates, // Legacy mapping
      requirements_public: data.requirements, // Legacy mapping
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

