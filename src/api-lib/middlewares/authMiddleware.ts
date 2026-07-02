import { adminAuth, db } from "../../lib/firebase-admin.js";
import { ErrorMonitor } from "../telemetry/errorMonitor.js";

export const verifyAuth = async (req: any, res: any, next: any) => {
    if (
      req.method === 'OPTIONS' ||
      req.path === '/audit' || 
      req.originalUrl === '/api/audit' || 
      req.originalUrl.includes('/oauth/callback') || 
      req.originalUrl.includes('/api/oauth/url') ||
      req.originalUrl.startsWith('/api/public') || 
      req.originalUrl.includes('/api/workspace/gmail/webhook') || 
      req.originalUrl.includes('/api/whatsapp/webhook')
    ) {
      return next();
    }
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        console.error(`[AuthMiddleware] No token provided for path ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      if (!adminAuth) {
        console.warn('adminAuth not initialized, skipping strict token validation');
        req.user = { uid: 'dev-mode', role: 'admin' }; 
        return next();
      }

      const decoded = await adminAuth.verifyIdToken(token);
      
      // Inject Workspace and Role for Multi-Tenant Isolation
      // We look up user profile to attach accurate RBAC info.
      if (db) {
         try {
            const userDoc = await db.collection('users').doc(decoded.uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                decoded.role = uData?.role || decoded.role || 'guest';
                decoded.orgId = uData?.organizationId || uData?.orgId || decoded.orgId;
            } else {
                decoded.role = decoded.role || 'guest';
            }
         } catch(e) {
             console.warn("Failed to retrieve user RBAC profile", e);
         }
      }

      req.user = decoded;
      next();
    } catch (err: any) {
      console.error('[AuthMiddleware] Token verification failed:', err.message);
      await ErrorMonitor.captureError({
          context: 'verifyAuth',
          errorType: 'BACKEND_EXCEPTION',
          errorMessage: err.message,
          metadata: { path: req.path }
      });
      return res.status(401).json({ error: 'Unauthorized: Invalid token', details: err.message });
    }
};

/**
 * RBAC Middleware for Role Validation
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Forbidden: No role assigned' });
        }
        
        // super_admin always has access
        if (req.user.role === 'super_admin') {
            return next();
        }
        
        const hasAccess = allowedRoles.some(role => req.user.role.includes(role));
        if (!hasAccess) {
             console.warn(`[RBAC] Access denied. User ${req.user.uid} with role ${req.user.role} attempted to access ${req.path}`);
             return res.status(403).json({ error: `Forbidden: Requires one of roles [${allowedRoles.join(',')}]` });
        }
        next();
    };
};
