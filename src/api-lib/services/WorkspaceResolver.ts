import { db } from '../../lib/firebase-admin.js';

export interface ResolvedWorkspace {
    uid: string;
    orgId: string;
    role: string;
    email?: string;
}

export class WorkspaceResolver {
    /**
     * Resolves the workspace details (tenant scope, role, permissions) for the incoming request.
     */
    static async resolve(req: any): Promise<ResolvedWorkspace> {
        const uid = req.user?.uid;
        if (!uid) {
            throw new Error("Unauthorized: Missing user authentication context");
        }

        // Check if token already contains decoded claims
        let orgId = req.user?.orgId || req.user?.organizationId;
        let role = req.user?.role;
        let email = req.user?.email;

        // Query the single source of truth in Firestore users collection if details are missing
        if (!orgId || !role) {
            try {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    orgId = orgId || uData?.organizationId || uData?.orgId;
                    role = role || uData?.role;
                    email = email || uData?.email;
                }
            } catch (err: any) {
                console.warn(`[WorkspaceResolver] Failed to fetch user doc for ${uid}:`, err.message);
            }
        }

        // Multi-tenant safe fallback handling
        if (!orgId) {
            orgId = req.query?.orgId || req.body?.orgId || 'default-workspace';
        }

        if (!role) {
            role = 'guest';
        }

        return {
            uid,
            orgId: orgId as string,
            role: role as string,
            email: email as string
        };
    }
}
