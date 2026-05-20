import { getAdminApp } from "@/src/server/firebase-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Enterprise Governance Sync Route
 * Bypasses Firestore rules via Admin SDK to provide HQ telemetry.
 */
export async function GET() {
  try {
    const app = getAdminApp();
    const db = app.firestore();
    const auth = app.auth();

    // 1. Fetch Parallel Collections
    const collections = [
      "users",
      "organizations",
      "execution_tracker",
      "onboarding_requests",
      "execution_events",
      "risk_assessments",
      "trust_metrics"
    ];

    const results: any = {
      ok: true,
      timestamp: Date.now(),
      mode: "LIVE",
      nodeId: app.options.projectId || "hirenest-os"
    };

    const fetchPromises = collections.map(async (name) => {
      const snap = await db.collection(name).limit(100).get();
      results[name] = snap.docs.map(doc => {
        const data = doc.data();
        // Safe Serialization
        return {
          id: doc.id,
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => {
              if (v && typeof v === 'object' && 'toDate' in v) {
                return [k, (v as any).toDate().toISOString()];
              }
              return [k, v];
            })
          )
        };
      });
    });

    await Promise.all(fetchPromises);

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[GOVERNANCE SYNC SYNDROME]", err);
    return NextResponse.json({
      ok: false,
      error: "GOVERNANCE_SYNC_DEGRADED",
      message: err.message,
      code: err.code || "INTERNAL_ERROR"
    }, { status: 500 });
  }
}
