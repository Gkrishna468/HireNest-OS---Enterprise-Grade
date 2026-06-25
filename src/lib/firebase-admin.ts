import { initializeApp, cert, getApps, App, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json in admin:", e);
}

function sanitizePrivateKey(key: string): string {
  let s = key.trim();
  if (s.startsWith('"')) s = s.substring(1);
  else if (s.startsWith("'")) s = s.substring(1);
  if (s.endsWith('"')) s = s.substring(0, s.length - 1);
  else if (s.endsWith("'")) s = s.substring(0, s.length - 1);
  s = s.replace(/\\n/g, "\n");
  return s.trim();
}

function isPlaceholder(val: string): boolean {
  const v = val.toLowerCase().trim();
  return v === "" || v.includes("placeholder") || v.includes("your-") || v.includes("your_") || v.includes("<") || v.includes(">") || v.includes("example.com") || v.includes("dummy") || v.length < 20;
}

function getCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    if (isPlaceholder(clientEmail) || isPlaceholder(privateKey)) return null;
    return { projectId, clientEmail, privateKey: sanitizePrivateKey(privateKey) };
  }

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    if (isPlaceholder(saJson)) return null;
    try {
      const sa = JSON.parse(saJson);
      if (sa.private_key) {
        if (isPlaceholder(sa.private_key) || (sa.client_email && isPlaceholder(sa.client_email))) return null;
        sa.private_key = sanitizePrivateKey(sa.private_key);
      }
      return sa;
    } catch (e: any) {
      console.warn("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON.", e.message);
    }
  }

  return null;
}

let app: App | undefined;
export let adminDb: any = null;
export let adminAuth: any = null;

try {
  const credentials = getCredentials();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId || "hirenest-os";

  if (getApps().length === 0) {
    if (credentials) {
      app = initializeApp({ credential: cert(credentials), projectId });
    } else {
      console.warn("[Firebase Admin] No valid credentials found. Ensure FIREBASE_SERVICE_ACCOUNT is set. Vercel deployments do NOT support applicationDefault() out of the box.");
      // We will not use applicationDefault() as it fails silently later in Vercel without ADC
    }
  } else {
    app = getApps()[0];
  }

  if (app) {
    try {
      adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
    } catch (e: any) {
      console.error("[Firebase Admin] Failed to initialize adminDb:", e.message);
    }

    try {
      adminAuth = getAuth(app);
    } catch (e: any) {
      console.error("[Firebase Admin] Failed to initialize adminAuth:", e.message);
    }
  }
} catch (globalInitError: any) {
  console.error("[Firebase Admin] Global critical init failed:", globalInitError.message);
}

export let runtimeMode: "FULL_ADMIN" | "CLIENT_FALLBACK" | "DEGRADED" = "CLIENT_FALLBACK";

if (adminDb) {
  runtimeMode = "FULL_ADMIN";
}

if (adminDb) {
  try {
    adminDb.collection("system").limit(1).get()
      .then(() => console.log("[Firebase Admin] Server-side Firestore verification successful."))
      .catch((err: any) => {
        console.warn("[Firebase Admin] Auth verification warning:", err.message);
        if (err.message.includes("UNAUTHENTICATED") || err.message.includes("PERMISSION_DENIED")) {
           console.warn("[Firebase Admin] Invalid credentials detected. Disabling adminDb.");
           
           adminDb = null;
           
           runtimeMode = "CLIENT_FALLBACK";
        }
      });
  } catch (syncErr: any) {
    console.warn("[Firebase Admin] Synchronous check failed.", syncErr.message);
  }
}

export const getAdminApp = () => app;
export const db = adminDb;
export const auth = adminAuth;
