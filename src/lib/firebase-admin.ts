import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getCredentials() {
  // Option 1: Individual fields (Recommended for stability)
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    };
  }

  // Option 2: Full Service Account JSON string
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    try {
      const sa = JSON.parse(saJson);
      if (sa.private_key) {
        sa.private_key = sa.private_key.replace(/\\n/g, "\n");
      }
      return sa;
    } catch (e) {
      console.warn("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON");
    }
  }

  return null;
}

let app: App;

if (getApps().length === 0) {
  const credentials = getCredentials();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hirenest-os";
  
  if (credentials) {
    app = initializeApp({
      credential: cert(credentials),
      projectId,
    });
  } else {
    console.warn("[Firebase Admin] Initializing with Application Default Credentials (will likely fail in sandbox)");
    app = initializeApp({
      projectId,
    });
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

// For backwards compatibility with old src/server/firebase-admin.ts
export const getAdminApp = () => app;
export const db = adminDb;
export const auth = adminAuth;
