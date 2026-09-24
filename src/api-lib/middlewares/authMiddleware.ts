import { adminAuth, db } from "../../lib/firebase-admin.js";
import { ErrorMonitor } from "../telemetry/errorMonitor.js";
import crypto from "crypto";

export const verifyAuth = async (req: any, res: any, next: any) => {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const currentPath = req.path || '';

    // 1. Health checks (exact matches on path)
    const isHealthCheck = [
      '/health',
      '/api/health',
      '/healthz',
      '/ready',
      '/readyz',
      '/live',
      '/ruflo/health',
      '/api/ruflo/health'
    ].includes(currentPath);

    // 2. Public API endpoints (starts with /api/public/)
    const isPublicApi = currentPath.startsWith('/api/public/') || currentPath === '/api/public-candidate-resume';

    // 3. OAuth callbacks
    const isOAuthCallback = currentPath === '/oauth/callback' || currentPath === '/api/oauth/callback';

    // 4. Named authenticated webhooks
    const isWebhook = [
      '/api/workspace/gmail/webhook',
      '/api/workspace/whatsapp/webhook',
      '/api/automation/events',
      '/api/automation-events'
    ].includes(currentPath);

    // 5. Public candidate AI interview actions (invitation rawToken is the authorization mechanism)
    const candidatePublicActions = new Set([
      "get-session",
      "verify-email",
      "record-consent",
      "livekit-token",
      "join-interview",
      "get-l1-report"
    ]);

    const cleanPath = currentPath.replace(/^\/api/, '');
    const isCandidateScreenRoute =
      cleanPath === '/candidate-screen' ||
      cleanPath === '/candidates/screen' ||
      (req.originalUrl && (req.originalUrl.includes('/candidate-screen') || req.originalUrl.includes('/candidates/screen')));

    const isPublicCandidateInterview =
      isCandidateScreenRoute &&
      req.method === 'POST' &&
      typeof req.body === 'object' &&
      candidatePublicActions.has(req.body?.action);

    if (isHealthCheck || isPublicApi || isOAuthCallback || isPublicCandidateInterview) {
      return next();
    }

    if (isWebhook) {
      const signature = req.headers['x-hirenest-signature'] || req.headers['X-HireNest-Signature'];
      if (!signature) {
        console.error(`[AuthMiddleware] Missing webhook signature header for path ${currentPath}`);
        return res.status(401).json({ error: 'Unauthorized: Missing required signature header: X-HireNest-Signature' });
      }

      const webhookSecret = process.env.N8N_WEBHOOK_SECRET || "IsxD4vM3BTAAphK3xlv/PWHikuARJwoc/vnTUtKpj90/iP4+tIvG229Ky4lwJtO4";
      const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawPayload)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error(`[AuthMiddleware] Invalid webhook signature for path ${currentPath}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid signature checksum.' });
      }

      return next();
    }

    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        console.error(`[AuthMiddleware] No token provided for path ${currentPath}`);
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      // Secure API Keys: hash the token (SHA-256) and query api_keys collection
      if (token.startsWith('HN_')) {
        if (!db) {
          return res.status(503).json({ error: 'Service Unavailable: Database authority offline' });
        }
        try {
          const hashedKey = crypto.createHash('sha256').update(token).digest('hex');
          const keySnap = await db.collection('api_keys').doc(hashedKey).get();
          if (keySnap.exists) {
            const keyData = keySnap.data();
            if (keyData && keyData.status === 'active') {
              req.user = {
                uid: keyData.userId || 'api-key-user',
                role: keyData.role || 'recruiter',
                orgId: keyData.orgId || 'hq',
                email: keyData.email || 'api@hirenest.com'
              };
              return next();
            }
          } else {
            // Support legacy plaintext document IDs but enforce active status check
            const plainSnap = await db.collection('api_keys').doc(token).get();
            if (plainSnap.exists) {
              const keyData = plainSnap.data();
              if (keyData && keyData.status === 'active') {
                req.user = {
                  uid: keyData.userId || 'api-key-user',
                  role: keyData.role || 'recruiter',
                  orgId: keyData.orgId || 'hq',
                  email: keyData.email || 'api@hirenest.com'
                };
                return next();
              }
            }
          }
        } catch (e: any) {
          console.warn("Failed to retrieve API key details from database:", e.message);
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
      }

      // Fail closed if adminAuth (Firebase Admin/Auth) is unavailable
      if (!adminAuth) {
        console.error('[AuthMiddleware] adminAuth is offline / unavailable');
        return res.status(503).json({ error: 'Service Unavailable: Authentication service is offline' });
      }

      let decoded: any = null;
      try {
        // Enforce verifyIdToken(token) to check token validity.
        decoded = await adminAuth.verifyIdToken(token);
      } catch (authErr: any) {
        console.error('[AuthMiddleware] verifyIdToken failed:', authErr.message);
        
        // Handle case where Identity Toolkit API is disabled in the Google Cloud Project or offline
        const isApiDisabled = authErr.message?.includes('identitytoolkit.googleapis.com') || 
                              authErr.message?.includes('IDENTITY_TOOLKIT_DISABLED') ||
                              authErr.message?.includes('Identity Toolkit API') ||
                              authErr.code === 'app/network-error' || 
                              authErr.code === 'app/network-timeout';
                              
        if (isApiDisabled) {
          console.error('[AuthMiddleware] Identity Toolkit API or Auth service is offline/disabled on GCP.');
          return res.status(503).json({ error: 'Service Unavailable: Authentication service is offline or unavailable' });
        }
        
        return res.status(401).json({ error: 'Unauthorized: Invalid token', details: authErr.message });
      }

      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      // Enforce email_verified == true
      if (decoded.email_verified !== true) {
        return res.status(401).json({ error: 'Unauthorized: Email is not verified' });
      }

      // Inject Workspace and Role for Multi-Tenant Isolation
      if (db) {
        try {
          const userDoc = await db.collection('users').doc(decoded.uid).get();
          if (userDoc.exists) {
            const uData = userDoc.data();
            if (uData?.status === 'INACTIVE' || uData?.disabled === true) {
              return res.status(403).json({ error: 'Forbidden: User account has been deactivated.' });
            }
            decoded.role = uData?.role || decoded.role || 'guest';
            decoded.orgId = uData?.organizationId || uData?.orgId || decoded.orgId;
            decoded.email = uData?.email || decoded.email;
          } else {
            decoded.role = decoded.role || 'guest';
          }
        } catch(e: any) {
          console.warn("Failed to retrieve user RBAC profile", e.message);
        }
      }

      req.user = decoded;
      return next();
    } catch (err: any) {
      console.error('[AuthMiddleware] Token verification failed:', err.message);
      await ErrorMonitor.captureError({
          context: 'verifyAuth',
          errorType: 'BACKEND_EXCEPTION',
          errorMessage: err.message,
          metadata: { path: currentPath }
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
