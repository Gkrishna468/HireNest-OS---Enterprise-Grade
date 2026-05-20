import admin from "firebase-admin";

/**
 * Robustly resolves the Firebase Service Account from environment variables.
 * Handles both raw JSON and strings with escaped newlines.
 */
function getServiceAccount() {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT || 
                 process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || 
                 process.env.NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT;

  if (!saJson || saJson === "undefined" || saJson === "null" || saJson === "") {
    console.warn("[ADMIN CORE] No Service Account found in environment. Falling back to Application Default Credentials.");
    return null;
  }

  // Security check: ensure it's not a Stripe key
  if (saJson.trim().startsWith('sk_')) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT contains a Stripe secret key (sk_...), expected Firebase Service Account JSON.");
  }

  try {
    let sa;
    const trimmed = saJson.trim();
    try {
      sa = JSON.parse(trimmed);
    } catch (e) {
      // Fallback: handle user error where they pasted JSON with line breaks that didn't stay quoted
      sa = JSON.parse(trimmed.replace(/\n/g, '\\n'));
    }

    if (sa.private_key) {
      // Robustly handle both single-escaped (\n) and double-escaped (\\n) newlines
      sa.private_key = sa.private_key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
    }
    return sa;
  } catch (err: any) {
    console.error("[ADMIN CORE] CRITICAL: Service Account JSON parsing failed:", err.message);
    throw new Error(`MALFORMED_FIREBASE_JSON: ${err.message}`);
  }
}

/**
 * Initializes and returns a singleton Firebase Admin instance.
 * Ensures strict project attribution.
 */
export function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const sa = getServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || 
                    process.env.PROJECT_ID || 
                    process.env.GOOGLE_CLOUD_PROJECT || 
                    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                    "hirenest-os";

  try {
    const config: admin.AppOptions = {
      projectId: projectId === "undefined" ? "hirenest-os" : projectId
    };

    if (sa) {
      config.credential = admin.credential.cert(sa);
    } else {
      config.credential = admin.credential.applicationDefault();
    }

    const app = admin.initializeApp(config);
    console.log(`[ADMIN CORE] Governance Layer Established for Node: ${app.options.projectId}`);
    return app;
  } catch (err: any) {
    console.error("[ADMIN CORE] Core Initialization Failure:", err.message);
    throw err;
  }
}

export const db = () => getAdminApp().firestore();
export const auth = () => getAdminApp().auth();
export const storage = () => getAdminApp().storage();

export default admin;
