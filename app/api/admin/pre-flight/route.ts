import { getAdminApp } from "@/src/server/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const results: any = {
      ok: true,
      runtime: "healthy",
      firebaseEnv: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "not_set",
      timestamp: Date.now(),
    };
    return Response.json(results);
  } catch (err: any) {
    return Response.json({
      ok: false,
      error: "PRE_FLIGHT_ERROR",
      message: err?.message
    }, { status: 500 });
  }
}
