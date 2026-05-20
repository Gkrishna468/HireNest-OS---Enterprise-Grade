export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  try {
    const admin = await import("firebase-admin");
    const firebase = await import("firebase/app");

    return res.status(200).json({
      ok: true,
      adminImported: !!admin,
      firebaseImported: !!firebase,
      timestamp: Date.now()
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message,
      stack: err?.stack,
    });
  }
}
