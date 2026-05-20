import admin from "firebase-admin";
import { getAdminApp } from "@/src/server/firebase-admin.ts";

export const runtime = "nodejs";

export async function GET() {
  try {
    const app = getAdminApp();
    
    const results: any = {
      ok: true,
      status: "operational",
      appsInitialized: admin.apps.length,
      projectId: app.options.projectId,
      timestamp: new Date().toISOString()
    };

    // Simple probes
    try {
      const users = await app.auth().listUsers(1);
      results.auth = "healthy";
      results.userCount = users.users.length;
    } catch (e: any) {
      results.auth = "degraded";
      results.authError = e.message;
    }

    try {
      await app.firestore().collection("_health_ping").limit(1).get();
      results.firestore = "healthy";
    } catch (e: any) {
      results.firestore = "unreachable";
      results.firestoreError = e.message;
    }

    return Response.json(results);
  } catch (err: any) {
    return Response.json({
      ok: false,
      error: "DIAGNOSTICS_FAILURE",
      message: err.message
    }, { status: 500 });
  }
}
