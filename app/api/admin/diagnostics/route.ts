import admin from "firebase-admin";
import { getAdminApp } from "@/src/server/firebase-admin.ts";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("[DIAG] STEP 1: Booting Admin Context");
    const app = getAdminApp();
    
    const results: any = {
      ok: true,
      status: "operational",
      appsInitialized: admin.apps.length,
      projectId: app.options.projectId,
      timestamp: new Date().toISOString(),
      runtime: "healthy"
    };

    console.log("[DIAG] STEP 2: Probing Authority (Auth)");
    try {
      const users = await app.auth().listUsers(1);
      results.auth = "healthy";
      results.userCount = users.users.length;
    } catch (e: any) {
      console.warn("[DIAG] Auth probe failed:", e.message);
      results.auth = "degraded";
      results.authError = e.message;
    }

    console.log("[DIAG] STEP 3: Probing Entity Mirror (Firestore)");
    try {
      await app.firestore().collection("_health_ping").limit(1).get();
      results.firestore = "healthy";
    } catch (e: any) {
      console.warn("[DIAG] Firestore probe failed:", e.message);
      results.firestore = "unreachable";
      results.firestoreError = e.message;
    }

    console.log("[DIAG] STEP 4: Finalizing Handshake");
    return Response.json(results);
  } catch (err: any) {
    console.error("[DIAG] FATAL CRASH:", err);
    return Response.json({
      ok: false,
      error: "DIAGNOSTICS_FAILURE",
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

