export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  return res.status(200).json({
    ok: true,
    timestamp: Date.now(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'production'
  });
}
