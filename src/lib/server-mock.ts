// Server mock for browser client bundles.
// Prevents Vite from bundling Node-only packages (like firebase-admin or @google-cloud/*) into the browser context.

export const adminDb: any = null;
export const adminAuth: any = null;
export const db: any = null;
export const auth: any = null;
export const runtimeMode = "CLIENT_FALLBACK";

export const initializeApp = () => null;
export const cert = () => null;
export const getApps = () => [];
export const applicationDefault = () => null;
export const getFirestore = () => null;
export const getAuth = () => null;
export const getStorage = () => null;
export const getAdminApp = () => null;

export default {
  initializeApp,
  cert,
  getApps,
  applicationDefault,
  getFirestore,
  getAuth,
  getStorage,
  adminDb,
  adminAuth,
  db,
  auth,
  runtimeMode,
};
