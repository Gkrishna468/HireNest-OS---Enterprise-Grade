import aiGatewayHandler from '../src/api-lib/handlers/ai-gateway.js';
import { adminAuth, adminDb } from '../src/lib/firebase-admin.js';

// Polyfill DOMMatrix for serverless runtime if needed
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor() {}
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    transformPoint(p: any) { return p; }
  };
}

export default async function handler(req: any, res: any) {
  const allowedOrigins = [
    'https://os.hirenestworkforce.com',
    'https://hirenestworkforce.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://os.hirenestworkforce.com' : '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-system-signature, x-org-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate request: require Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  if (!adminAuth) {
    return res.status(503).json({ error: 'Service Unavailable: Authentication service offline' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    if (adminDb && (!req.user.role || !req.user.organizationId)) {
      try {
        const userDoc = await adminDb.collection("users").doc(req.user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data) {
            if (!req.user.role && data.role) req.user.role = data.role;
            if (!req.user.organizationId && (data.organizationId || data.orgId)) {
              req.user.organizationId = data.organizationId || data.orgId;
            }
          }
        }
      } catch (_) {}
    }
  } catch (authErr: any) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token', details: authErr.message });
  }

  return await aiGatewayHandler(req, res);
}
