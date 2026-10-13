import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const getEnvVar = (name: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[name] || (import.meta as any).env[`VITE_${name}`];
  }
  return undefined;
};

const rawProjectId = 
  getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || 
  getEnvVar('FIREBASE_PROJECT_ID') || 
  firebaseConfig.projectId;

const emulatorHost = 
  getEnvVar('FIRESTORE_EMULATOR_HOST') || 
  getEnvVar('VITE_FIRESTORE_EMULATOR_HOST');

const authEmulatorHost = 
  getEnvVar('FIREBASE_AUTH_EMULATOR_HOST') || 
  getEnvVar('VITE_FIREBASE_AUTH_EMULATOR_HOST');

const storageEmulatorHost = 
  getEnvVar('FIREBASE_STORAGE_EMULATOR_HOST') || 
  getEnvVar('VITE_FIREBASE_STORAGE_EMULATOR_HOST');

const isEmulator = !!emulatorHost;
const nodeEnv = getEnvVar('NODE_ENV');
const stagingMode = getEnvVar('STAGING_MODE') || getEnvVar('VITE_STAGING_MODE');
const isStaging = getEnvVar('IS_STAGING');
const isRunningInTestContext = 
  nodeEnv === 'test' || 
  getEnvVar('npm_lifecycle_event') === 'test' ||
  (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.some(arg => /[\/\\\.](test|spec)[\.\\\/]/i.test(arg) || arg.endsWith('.test.ts') || arg.endsWith('.test.js') || arg === '--test')) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test');

const isTestOrStaging = 
  isRunningInTestContext ||
  nodeEnv === 'staging' || 
  stagingMode === 'true' || 
  isStaging === 'true';

const isEmulatorOrStagingOrTest = isEmulator || isTestOrStaging;
const isLiveProductionProject = rawProjectId === 'hirenest-os';

// FAIL-CLOSED CLIENT TARGET GUARD
// 1. Client Firebase SDK MUST NOT target live production project 'hirenest-os' in Staging/Test environment without emulator
if (isEmulatorOrStagingOrTest && isLiveProductionProject && !isEmulator) {
  const msg = "[FAIL-CLOSED GUARD] CRITICAL SECURITY ALERT: Client Firebase SDK attempted to target live production project 'hirenest-os' in Staging/Test environment without emulator. Execution halted.";
  console.error(msg);
  throw new Error("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED: Client Firebase SDK cannot target 'hirenest-os' in Staging/Test environment without emulator.");
}

// 2. Client Firebase SDK MUST NOT target unprovisioned placeholder 'hirenest-staging-db' without emulator
if (isTestOrStaging && !isEmulator && (rawProjectId === 'hirenest-staging-db' || !rawProjectId)) {
  const msg = "[FAIL-CLOSED GUARD] CRITICAL: 'hirenest-staging-db' is an unprovisioned placeholder. Remote staging is on hold. Please configure FIRESTORE_EMULATOR_HOST to run against the local emulator.";
  console.error(msg);
  throw new Error("UNPROVISIONED_STAGING_TARGET_ERROR: 'hirenest-staging-db' is an unprovisioned placeholder. Remote staging is on hold. Connect to the local Firebase Emulator (FIRESTORE_EMULATOR_HOST) for local testing.");
}

const resolvedProjectId = isEmulator && (isLiveProductionProject || !rawProjectId || rawProjectId === 'hirenest-staging-db')
  ? "demo-hirenest-emulator"
  : rawProjectId;

const config = {
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY') || getEnvVar('FIREBASE_API_KEY') || firebaseConfig.apiKey,
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || getEnvVar('FIREBASE_AUTH_DOMAIN') || firebaseConfig.authDomain,
  projectId: resolvedProjectId,
  storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || getEnvVar('FIREBASE_STORAGE_BUCKET') || firebaseConfig.storageBucket,
  messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || getEnvVar('FIREBASE_MESSAGING_SENDER_ID') || firebaseConfig.messagingSenderId,
  appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID') || getEnvVar('FIREBASE_APP_ID') || firebaseConfig.appId,
};

const app = getApps().length === 0 ? initializeApp(config) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to emulators if configured
if (isEmulator && emulatorHost) {
  try {
    const [host, portStr] = emulatorHost.split(':');
    const port = portStr ? parseInt(portStr, 10) : 8080;
    connectFirestoreEmulator(db, host || '127.0.0.1', port);
  } catch {
    // Ignore already connected warnings in HMR
  }
}

if (authEmulatorHost) {
  try {
    const authUrl = authEmulatorHost.startsWith('http') ? authEmulatorHost : `http://${authEmulatorHost}`;
    connectAuthEmulator(auth, authUrl, { disableWarnings: true });
  } catch {
    // Ignore already connected warnings in HMR
  }
}

if (storageEmulatorHost) {
  try {
    const [host, portStr] = storageEmulatorHost.split(':');
    const port = portStr ? parseInt(portStr, 10) : 9199;
    connectStorageEmulator(storage, host || '127.0.0.1', port);
  } catch {
    // Ignore already connected warnings in HMR
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);
  
  // Dispatch a custom event instead of throwing an uncatchable error that crashes the React tree
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const event = new CustomEvent('firestore-security-error', { detail: errInfo });
      window.dispatchEvent(event);
    } catch {
      // Ignore if event dispatch fails
    }
  }
  
  return errInfo;
}
