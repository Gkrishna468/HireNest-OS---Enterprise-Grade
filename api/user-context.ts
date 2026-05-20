import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  try {
    res.status(200).json({
      success: true,
      user: {
        uid: "system-init-user",
        name: "Enterprise Admin",
        email: "admin@hirenestworkforce.com",
        role: "super_admin",
        organizationId: "ORG-GLOBAL-HQ",
        status: "active",
        permissions: [
          "manage_users",
          "manage_requirements",
          "view_diagnostics",
          "execute_governance",
          "manage_vendors",
          "manage_clients"
        ]
      },
      environment: "production",
      platformStatus: "stable"
    });
  } catch (error: any) {
    res.status(200).json({ 
      success: false, 
      error: error.message,
      fallback: true,
      role: "guest"
    });
  }
}
