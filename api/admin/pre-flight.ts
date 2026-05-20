export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  try {
    return res.status(200).json({
      ok: true,
      firebaseEnv: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "not_set",
      nodeVersion: process.version,
      timestamp: Date.now()
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message,
    });
  }
}
