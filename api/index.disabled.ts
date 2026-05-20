export const runtime = "nodejs";

import expressAppPromise from "../server";

export default async function handler(req: any, res: any) {
  try {
    const app = await expressAppPromise;
    return app(req, res);
  } catch (err: any) {
    console.error("[VERCEL HANDLER FATAL]", err);
    return res.status(500).json({
      error: "VERCEL_HANDLER_BOOT_FAILURE",
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
