import { initializeApp, cert, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
if (typeof window === 'undefined') {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to load firebase-applet-config.json in admin:", e);
  }
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
    if (!clientEmail.includes('gserviceaccount.com')) {
      console.warn(`[Firebase Admin] FIREBASE_CLIENT_EMAIL (${clientEmail}) is not a service account email. Skipping manual credentials to allow default service account credentials fallback.`);
      return null;
    }
    return { projectId, clientEmail, privateKey: sanitizePrivateKey(privateKey) };
  }

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    if (isPlaceholder(saJson)) return null;
    if (!saJson.trim().startsWith('{')) {
      console.warn(`[Firebase Admin] FIREBASE_SERVICE_ACCOUNT does not start with '{'. Skipping parsing as JSON to allow default credentials fallback.`);
      return null;
    }
    try {
      const sa = JSON.parse(saJson);
      if (sa.private_key) {
        if (isPlaceholder(sa.private_key) || (sa.client_email && isPlaceholder(sa.client_email))) return null;
        sa.private_key = sanitizePrivateKey(sa.private_key);
      }
      return sa;
    } catch (e: any) {
      console.warn(`[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON: ${e.message}. Skipping manual credentials.`);
    }
  }

  return null;
}

let app: any = undefined;
export let adminDb: any = null;
export let adminAuth: any = null;

if (typeof window === 'undefined') {
  const credentials = getCredentials();
  const isManagedEnv = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
  let projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;

  // FAIL-CLOSED TARGET PROJECT GUARD
  const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const isRunningInTestContext = 
    process.env.NODE_ENV === 'test' || 
    process.env.npm_lifecycle_event === 'test' ||
    (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.some(arg => /[\/\\\.](test|spec)[\.\\\/]/i.test(arg) || arg.endsWith('.test.ts') || arg.endsWith('.test.js') || arg === '--test'));

  const isTestOrStaging = 
    isRunningInTestContext ||
    process.env.NODE_ENV === 'staging' || 
    process.env.STAGING_MODE === 'true' || 
    process.env.IS_STAGING === 'true';

  const isEmulatorOrStagingOrTest = isEmulator || isTestOrStaging;
  const isLiveProductionProject = projectId === 'hirenest-os';

  // Security Audit Log: Check for prohibited override attempts
  if (isEmulatorOrStagingOrTest && process.env.ALLOW_PRODUCTION_WRITES === 'true') {
    console.warn("[FAIL-CLOSED GUARD] SECURITY AUDIT WARNING: ALLOW_PRODUCTION_WRITES is prohibited and rejected in non-production environments.");
  }

  // GAP 1 & GAP 2: Fail-closed production protection guard.
  // In staging or test mode, targeting 'hirenest-os' without a local emulator is strictly prohibited.
  // ALLOW_PRODUCTION_WRITES cannot bypass this guard.
  // Thrown outside try/catch so it can NEVER be swallowed.
  if (isEmulatorOrStagingOrTest && isLiveProductionProject && !isEmulator) {
    const msg = "[FAIL-CLOSED GUARD] CRITICAL SECURITY ALERT: Staging, Test, or Local environment attempted to target live production project 'hirenest-os' without a local emulator. ALLOW_PRODUCTION_WRITES is prohibited in non-production. Execution halted immediately to protect production data integrity.";
    console.error(msg);
    throw new Error("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED: Live production project 'hirenest-os' cannot be targeted in Staging/Test/Emulator environment.");
  }

  // GAP 4: Placeholder 'hirenest-staging-db' clarification.
  // 'hirenest-staging-db' is NOT a provisioned Firebase project.
  // If targeted without emulator, hard fail to prevent assuming unprovisioned remote staging.
  if (isTestOrStaging && !isEmulator && (projectId === 'hirenest-staging-db' || !projectId)) {
    const msg = "[FAIL-CLOSED GUARD] CRITICAL: 'hirenest-staging-db' is an unprovisioned placeholder. Remote staging is on hold. Please configure FIRESTORE_EMULATOR_HOST to run against the local emulator.";
    console.error(msg);
    throw new Error("UNPROVISIONED_STAGING_TARGET_ERROR: 'hirenest-staging-db' is an unprovisioned placeholder. Remote staging is on hold. Connect to the local Firebase Emulator (FIRESTORE_EMULATOR_HOST) for local testing.");
  }

  // If running in local emulator mode, force offline demo project namespace if targeting production or placeholder
  if (isEmulator && (isLiveProductionProject || !projectId || projectId === 'hirenest-staging-db')) {
    projectId = "demo-hirenest-emulator";
  }

  try {
    if (getApps().length === 0) {
      const tryAppDefault = () => {
        try {
          return initializeApp({ credential: applicationDefault(), projectId });
        } catch (e: any) { return null; }
      };
      const tryManual = () => {
        if (!credentials) return null;
        try {
          return initializeApp({ credential: cert(credentials), projectId });
        } catch (e: any) { return null; }
      };
      if (isManagedEnv && !credentials) {
        app = tryAppDefault() || initializeApp({ projectId });
      } else {
        app = tryManual() || tryAppDefault() || initializeApp({ projectId });
      }
    } else {
      app = getApps()[0];
    }

    if (app) {
      try {
        adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
        adminDb.settings({ ignoreUndefinedProperties: true });
      } catch (e: any) { console.error("[Firebase Admin] Failed to initialize adminDb:", e.message); }
      try {
        adminAuth = getAuth(app);
      } catch (e: any) { console.error("[Firebase Admin] Failed to initialize adminAuth:", e.message); }
    }
  } catch (globalInitError: any) {
    if (
      globalInitError?.message?.includes("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED") ||
      globalInitError?.message?.includes("UNPROVISIONED_STAGING_TARGET_ERROR")
    ) {
      throw globalInitError;
    }
    console.error("[Firebase Admin] Global critical init failed:", globalInitError.message);
  }
}

export let runtimeMode: "FULL_ADMIN" | "CLIENT_FALLBACK" | "DEGRADED" = adminDb ? "FULL_ADMIN" : "CLIENT_FALLBACK";

export const getAdminApp = () => app;

export const db = new Proxy({}, {
  get: (target, prop) => {
    if (!adminDb) return undefined;
    const val = adminDb[prop];
    return typeof val === 'function' ? val.bind(adminDb) : val;
  }
}) as any;

export const auth = new Proxy({}, {
  get: (target, prop) => {
    if (!adminAuth) {
      throw new Error("FIREBASE_ADMIN_AUTH_UNAVAILABLE");
    }
    const val = adminAuth[prop];
    return typeof val === 'function' ? val.bind(adminAuth) : val;
  }
}) as any;
