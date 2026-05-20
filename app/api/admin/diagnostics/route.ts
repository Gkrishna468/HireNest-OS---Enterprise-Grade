import admin from "firebase-admin";
import { getAdminApp } from "@/src/server/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("[DIAG] STEP 1: Booting Admin Context");
    const app = getAdminApp();
    
    console.log("[DIAG] STEP 2: Initializing Subsystems");
    const db = app.firestore();
    const auth = app.auth();

    const results: any = {
      ok: true,
      status: "operational",
      appsInitialized: admin.apps.length,
      projectId: app.options.projectId,
      timestamp: new Date().toISOString(),
      runtime: "healthy"
    };

    console.log("[DIAG] STEP 3: Probing Authority (Auth)");
    try {
      await auth.listUsers(1);
      results.auth = "healthy";
    } catch (e: any) {
      console.warn("[DIAG] Auth probe failed:", e.message);
      results.auth = "degraded";
      results.authError = e.message;
    }

    console.log("[DIAG] STEP 4: Probing Entity Mirror (Firestore)");
    try {
      await db.collection("_health_ping").limit(1).get();
      results.firestore = "healthy";
    } catch (e: any) {
      console.warn("[DIAG] Firestore probe failed:", e.message);
      results.firestore = "unreachable";
      results.firestoreError = e.message;
    }

    results.governance = (results.auth === "healthy" && results.firestore === "healthy") ? "healthy" : "degraded";

    console.log("[DIAG] STEP 5: Finalizing Handshake");
    return Response.json(results);
  } catch (err: any) {
    console.error("[DIAG] FATAL CRASH:", err);
    return Response.json({
      ok: false,
      phase: "diagnostics",
      error: "DIAGNOSTICS_FAILURE",
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

