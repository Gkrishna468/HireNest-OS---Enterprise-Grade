import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function sanitizePrivateKey(key: string): string {
  let s = key.trim();
  if (s.startsWith('"')) {
    s = s.substring(1);
  } else if (s.startsWith("'")) {
    s = s.substring(1);
  }
  if (s.endsWith('"')) {
    s = s.substring(0, s.length - 1);
  } else if (s.endsWith("'")) {
    s = s.substring(0, s.length - 1);
  }
  s = s.replace(/\\n/g, "\n");
  return s.trim();
}

function getCredentials() {
  // Option 1: Individual fields (Recommended for stability)
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: sanitizePrivateKey(privateKey),
    };
  }

  // Option 2: Full Service Account JSON string
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    try {
      const sa = JSON.parse(saJson);
      if (sa.private_key) {
        sa.private_key = sanitizePrivateKey(sa.private_key);
      }
      return sa;
    } catch (e) {
      console.warn("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON");
    }
  }

  return null;
}

let app: App;

try {
  if (getApps().length === 0) {
    const credentials = getCredentials();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hirenest-os";
    
    if (credentials) {
      try {
        app = initializeApp({
          credential: cert(credentials),
          projectId,
        });
      } catch (certError: any) {
        console.error("[Firebase Admin] Fatal Error initializing cert, falling back to ADC:", certError.message);
        app = initializeApp({
          projectId,
        });
      }
    } else {
      console.warn("[Firebase Admin] Initializing with Application Default Credentials (will likely fail in sandbox)");
      app = initializeApp({
        projectId,
      });
    }
  } else {
    app = getApps()[0];
  }
} catch (globalInitError: any) {
  console.error("[Firebase Admin] Global critical init failed:", globalInitError.message);
  // Fallback to minimal initialization so compiling is fine and handler doesn't crash on import
  try {
    app = initializeApp({ projectId: "hirenest-os" });
  } catch (_) {
    app = (getApps()[0] || {}) as App;
  }
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

// For backwards compatibility with old src/server/firebase-admin.ts
export const getAdminApp = () => app;
export const db = adminDb;
export const auth = adminAuth;
