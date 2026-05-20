export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  try {
    // Lazy load admin only if needed
    const admin = await import("firebase-admin").then(m => m.default || m);
    const { getAdminApp } = await import("../../src/server/firebase-admin");
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

    return res.status(200).json(results);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: "DIAGNOSTICS_FAILURE",
      message: err.message,
      stack: err.stack
    });
  }
}
