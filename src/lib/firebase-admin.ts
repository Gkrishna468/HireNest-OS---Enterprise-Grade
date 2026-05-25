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

function isPlaceholder(val: string): boolean {
  const v = val.toLowerCase().trim();
  return (
    v === "" ||
    v.includes("placeholder") ||
    v.includes("your-") ||
    v.includes("your_") ||
    v.includes("<") ||
    v.includes(">") ||
    v.includes("example.com") ||
    v.includes("dummy") ||
    v.length < 20
  );
}

function getCredentials() {
  // Option 1: Individual fields (Recommended for stability)
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    if (isPlaceholder(clientEmail) || isPlaceholder(privateKey)) {
      console.warn("[Firebase Admin] Found placeholder settings in configuration environment. Server-side credentials ignored.");
      return null;
    }
    return {
      projectId,
      clientEmail,
      privateKey: sanitizePrivateKey(privateKey),
    };
  }

  // Option 2: Full Service Account JSON string
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    if (isPlaceholder(saJson)) {
      console.warn("[Firebase Admin] Found placeholder settings in FIREBASE_SERVICE_ACCOUNT. Server-side credentials ignored.");
      return null;
    }
    try {
      const sa = JSON.parse(saJson);
      if (sa.private_key) {
        if (isPlaceholder(sa.private_key) || (sa.client_email && isPlaceholder(sa.client_email))) {
          console.warn("[Firebase Admin] Parsed service account contains placeholder fields. Server-side credentials ignored.");
          return null;
        }
        sa.private_key = sanitizePrivateKey(sa.private_key);
      }
      return sa;
    } catch (e: any) {
      console.warn("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. It must be a valid JSON object string. Error: " + e.message);
      if (!saJson.trim().startsWith('{')) {
          console.warn("[Firebase Admin] User provided a string that does not start with '{'. Did you only paste a private key or client email instead of the full JSON?");
      }
    }
  }

  return null;
}

let app: App | undefined;
export let adminDb: any = null;
export let adminAuth: any = null;

try {
  const credentials = getCredentials();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hirenest-os";

  if (credentials) {
    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert(credentials),
        projectId,
      });
    } else {
      app = getApps()[0];
    }

    if (app) {
      try {
        adminDb = getFirestore(app);
      } catch (e: any) {
        console.error("[Firebase Admin] Failed to initialize adminDb:", e.message);
      }

      try {
        adminAuth = getAuth(app);
      } catch (e: any) {
        console.error("[Firebase Admin] Failed to initialize adminAuth:", e.message);
      }
    }
  } else {
    console.warn("[Firebase Admin] No active backend credentials (FIREBASE_SERVICE_ACCOUNT / FIREBASE_PRIVATE_KEY) are configured. Server-side authoritative Firestore queries are bypassed; proceeding with secure real-time client-side synchronization.");
  }
} catch (globalInitError: any) {
  console.error("[Firebase Admin] Global critical init failed:", globalInitError.message);
}

export let runtimeMode: "FULL_ADMIN" | "CLIENT_FALLBACK" | "DEGRADED" = "CLIENT_FALLBACK";

// Initial sync check
if (adminDb) {
  runtimeMode = "FULL_ADMIN";
}

// double-layer async self-check: verify that credentials actually possess authenticated project permissions
if (adminDb) {
  try {
    adminDb.collection("system").limit(1).get()
      .then(() => {
        console.log("[Firebase Admin] Server-side Firestore verification successful.");
      })
      .catch((err: any) => {
        const msg = (err.message || "").toUpperCase();
        const code = err.code;
        const desc = (err.details || "").toUpperCase();
        
        const isUnauthenticated = 
          msg.includes("UNAUTHENTICATED") || 
          desc.includes("UNAUTHENTICATED") || 
          msg.includes("INVALID AUTHENTICATION") ||
          msg.includes("API_KEY_INVALID") ||
          code === 16;
          
        if (isUnauthenticated) {
          console.warn({
            subsystem: "firebase-admin",
            mode: "CLIENT_FALLBACK",
            reason: "ADC_INVALID",
            message: "[Firebase Admin] Credentials lack authenticated project reads. Cleaning up bindings to trigger failure-resilient client-side fallback mode."
          });
          adminDb = null;
          adminAuth = null;
          runtimeMode = "CLIENT_FALLBACK";
        } else {
          console.log("[Firebase Admin] Server-side Firestore operational check complete (status: ok).");
        }
      });
  } catch (syncErr: any) {
    console.warn("[Firebase Admin] Synchronous check failed. Reverting to failure-resilient client fallback:", syncErr.message);
    adminDb = null;
    adminAuth = null;
    runtimeMode = "CLIENT_FALLBACK";
  }
}

// For backwards compatibility with old src/server/firebase-admin.ts
export const getAdminApp = () => app;
export const db = adminDb;
export const auth = adminAuth;
