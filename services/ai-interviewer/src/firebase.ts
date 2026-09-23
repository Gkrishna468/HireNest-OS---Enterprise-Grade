import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

let adminDb: any;
let adminAuth: any;

try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

  if (getApps().length === 0) {
    if (serviceAccount && serviceAccount.trim().startsWith("{")) {
      console.log("[Firebase Worker] Initializing with explicit service account...");
      const parsedAccount = JSON.parse(serviceAccount);
      initializeApp({
        credential: cert(parsedAccount),
        projectId
      });
    } else {
      console.log("[Firebase Worker] Initializing with application default credentials...");
      initializeApp({
        projectId
      });
    }
  }

  adminDb = getFirestore();
  adminAuth = getAuth();
  adminDb.settings({ ignoreUndefinedProperties: true });
  console.log("[Firebase Worker] Firestore database connection bootstrapped successfully.");
} catch (err: any) {
  console.error("[Firebase Worker] Critical failure initializing database. Using fallback/mock driver:", err.message);
  adminDb = {} as any;
  adminAuth = {} as any;
}

export { adminDb, adminAuth };
