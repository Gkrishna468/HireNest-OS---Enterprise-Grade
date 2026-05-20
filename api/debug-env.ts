export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    return res.status(200).json({
      ok: true,
      exists: !!raw,
      length: raw?.length || 0,
      startsWith: raw?.substring(0, 40),
      containsPrivateKey: raw?.includes("BEGIN PRIVATE KEY"),
      containsSingleEscape: raw?.includes("\\n"),
      containsDoubleEscape: raw?.includes("\\\\n"),
      projectIdEnv: process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
      nodeVersion: process.version,
      time: Date.now()
    });
  } catch (e: any) {
    return res.status(500).json({ 
      ok: false,
      error: "DEBUG_ENV_ERROR", 
      message: e.message 
    });
  }
}
