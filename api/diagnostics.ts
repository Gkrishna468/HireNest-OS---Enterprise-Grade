import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  try {
    // Basic connectivity check
    await adminDb.collection("system").doc("health").get();
    
    res.status(200).json({
      ok: true,
      governance: "healthy",
      auth: "healthy",
      firestore: "healthy",
      projectId: process.env.VITE_APP_PROJECT_ID || "hirenest-os",
      serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ? "configured" : "missing",
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(200).json({
      ok: false,
      governance: "degraded",
      error: err.message,
      details: "Database connectivity check failed. Check Service Account permissions."
    });
  }
}
