export default async function handler(req: any, res: any) {
  res.status(200).json({
    ok: true,
    status: "operational",
    runtimeProjectId: process.env.VITE_APP_PROJECT_ID || "hirenest-os",
    identitySource: "Vercel / Cloud Run",
    timestamp: new Date().toISOString()
  });
}
