import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

export const runtime = "nodejs";

/**
 * Enterprise Diagnostics Node
 * STRICT ISOLATION POLICY: No shared library imports.
 */

function getRobustAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT || 
                 process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!saJson) {
    throw new Error("MISSING_SERVICE_ACCOUNT_NODE");
  }

  try {
    let sa;
    const trimmed = saJson.trim();
    try {
      sa = JSON.parse(trimmed);
    } catch (e) {
      // Handle escaped newlines or loose formatting
      sa = JSON.parse(trimmed.replace(/\n/g, '\\n'));
    }

    if (sa.private_key) {
      sa.private_key = sa.private_key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID || "hirenest-os"
    });
  } catch (err: any) {
    console.error("[DIAGNOSTICS] INIT_FAILURE", err.message);
    throw err;
  }
}

export async function GET() {
  try {
    const app = getRobustAdminApp();
    const auth = admin.auth(app);
    const db = admin.firestore(app);

    // 1. Connectivity Probe
    const authProbe = await auth.listUsers(1);
    
    // 2. Storage Connectivity (Basic)
    const dbProbe = await db.collection("_health").limit(1).get();

    return NextResponse.json({
      ok: true,
      status: "STABLE",
      handshake: "SUCCESS",
      projectId: app.options.projectId,
      probes: {
        auth: { status: "ACTIVE", count: authProbe.users.length },
        firestore: { status: "ACTIVE", docs: dbProbe.size }
      },
      timestamp: Date.now(),
      vibe: "PROPER_GOVERNANCE"
    });
  } catch (err: any) {
    console.error("[DIAGNOSTICS_FATAL]", err);
    return NextResponse.json({
      ok: false,
      status: "DEGRADED",
      error: err.message,
      code: err.code || "INTERNAL_FAILURE",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
