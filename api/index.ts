// Polyfill Promise.try for third-party libraries (e.g., pdf-parse, pdfjs-dist)
if (typeof (Promise as any).try === 'undefined') {
  (Promise as any).try = function <T>(fn: (...args: any[]) => T | PromiseLike<T>, ...args: any[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        resolve(fn(...args));
      } catch (error) {
        reject(error);
      }
    });
  };
}

// Polyfill DOMMatrix for Node.js environments when running pdfjs-dist
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length >= 6) {
        this.a = this.m11 = Number(init[0]) || 0;
        this.b = this.m12 = Number(init[1]) || 0;
        this.c = this.m21 = Number(init[2]) || 0;
        this.d = this.m22 = Number(init[3]) || 0;
        this.e = this.m41 = Number(init[4]) || 0;
        this.f = this.m42 = Number(init[5]) || 0;
        this.isIdentity = (this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0);
      }
    }
    multiply(other: any) { return this; }
    translate(tx = 0, ty = 0) { return this; }
    scale(sx = 1, sy = sx) { return this; }
    rotate(angle = 0) { return this; }
    transformPoint(point: any) { return point; }
    inverse() { return this; }
  };
}

// Polyfill Uint8Array.prototype.toHex for newer versions of pdfjs-dist
if (typeof (Uint8Array.prototype as any).toHex !== 'function') {
  (Uint8Array.prototype as any).toHex = function (this: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < this.length; i++) {
      hex += this[i].toString(16).padStart(2, '0');
    }
    return hex;
  };
}

// Polyfill Map and WeakMap getOrInsertComputed and getOrInsert for pdfjs-dist and modern ECMAScript specifications
if (typeof (Map.prototype as any).getOrInsertComputed !== 'function') {
  (Map.prototype as any).getOrInsertComputed = function (key: any, callback: (key: any) => any): any {
    if (this.has(key)) {
      return this.get(key);
    }
    const value = callback(key);
    this.set(key, value);
    return value;
  };
}

if (typeof (Map.prototype as any).getOrInsert !== 'function') {
  (Map.prototype as any).getOrInsert = function (key: any, value: any): any {
    if (this.has(key)) {
      return this.get(key);
    }
    this.set(key, value);
    return value;
  };
}

if (typeof (WeakMap.prototype as any).getOrInsertComputed !== 'function') {
  (WeakMap.prototype as any).getOrInsertComputed = function (key: any, callback: (key: any) => any): any {
    if (this.has(key)) {
      return this.get(key);
    }
    const value = callback(key);
    this.set(key, value);
    return value;
  };
}

if (typeof (WeakMap.prototype as any).getOrInsert !== 'function') {
  (WeakMap.prototype as any).getOrInsert = function (key: any, value: any): any {
    if (this.has(key)) {
      return this.get(key);
    }
    this.set(key, value);
    return value;
  };
}

// Polyfill Math.sumPrecise for modern ECMAScript specifications
if (typeof (Math as any).sumPrecise !== 'function') {
  (Math as any).sumPrecise = function (iterable: any): number {
    if (iterable === null || iterable === undefined || typeof iterable[Symbol.iterator] !== 'function') {
      throw new TypeError('Math.sumPrecise: Argument must be an iterable');
    }

    let hasElements = false;
    let hasNaN = false;
    let hasPositiveInfinity = false;
    let hasNegativeInfinity = false;
    
    const values: number[] = [];
    for (const item of iterable) {
      if (typeof item !== 'number') {
        throw new TypeError('Math.sumPrecise: All elements must be numbers');
      }
      hasElements = true;
      if (Number.isNaN(item)) {
        hasNaN = true;
      } else if (item === Infinity) {
        hasPositiveInfinity = true;
      } else if (item === -Infinity) {
        hasNegativeInfinity = true;
      } else {
        values.push(item);
      }
    }

    if (!hasElements) {
      return -0;
    }

    if (hasNaN || (hasPositiveInfinity && hasNegativeInfinity)) {
      return NaN;
    }
    if (hasPositiveInfinity) {
      return Infinity;
    }
    if (hasNegativeInfinity) {
      return -Infinity;
    }

    let sum = -0;
    let c = 0;
    for (let i = 0; i < values.length; i++) {
      const x = values[i];
      if (i === 0) {
        sum = x;
        continue;
      }
      const t = sum + x;
      if (Math.abs(sum) >= Math.abs(x)) {
        c += (sum - t) + x;
      } else {
        c += (x - t) + sum;
      }
      sum = t;
    }

    return sum + c;
  };
}

import { adminAuth, adminDb } from '../src/lib/firebase-admin.js';
import adminHandler from '../src/api-lib/handlers/admin.js';
import aiGatewayHandler from '../src/api-lib/handlers/ai-gateway.js';
import aiHealthHandler from '../src/api-lib/handlers/ai-health.js';
import analyticsHandler from '../src/api-lib/handlers/analytics.js';
import automationEventsHandler from '../src/api-lib/handlers/automation-events.js';
import billingHandler from '../src/api-lib/handlers/billing.js';
import bulkParseResumesHandler from '../src/api-lib/handlers/bulk-parse-resumes.js';
import candidateScreenHandler from '../src/api-lib/handlers/candidate-screen.js';
import candidatePortalHandler from '../src/api-lib/handlers/candidate-portal.js';
import candidatesHandler from '../src/api-lib/handlers/candidates.js';
import cleanupMatchesHandler from '../src/api-lib/handlers/cleanup-matches.js';
import clientAiMatchesHandler from '../src/api-lib/handlers/client-ai-matches.js';
import clientCandidateHandler from '../src/api-lib/handlers/client-candidate.js';
import clientSubmissionsHandler from '../src/api-lib/handlers/client-submissions.js';
import communicationHandler from '../src/api-lib/handlers/communication.js';
import copilotHandler from '../src/api-lib/handlers/copilot.js';
import cronHandler from '../src/api-lib/handlers/cron.js';
import dailyBriefingHandler from '../src/api-lib/handlers/daily-briefing.js';
import eventsHandler from '../src/api-lib/handlers/events.js';
import executiveMetricsHandler from '../src/api-lib/handlers/executive-metrics.js';
import extractTextHandler from '../src/api-lib/handlers/extract-text.js';
import googleProxyHandler from '../src/api-lib/handlers/google-proxy.js';
import integrationsHandler from '../src/api-lib/handlers/integrations.js';
import intelHandler from '../src/api-lib/handlers/intel.js';
import interviewsHandler from '../src/api-lib/handlers/interviews.js';
import killSwitchHandler from '../src/api-lib/handlers/kill-switch.js';
import matchDetailedHandler from '../src/api-lib/handlers/match-candidates-detailed.js';
import matchHealthHandler from '../src/api-lib/handlers/match-health.js';
import matchingGlobalHandler from '../src/api-lib/handlers/matching-global.js';
// Lazy loaded to isolate other endpoints from potential mapping domain initialization failures:
// import networkMappingHandler from '../src/api-lib/handlers/network-mapping.js';
import oauthHandler from '../src/api-lib/handlers/oauth.js';
import opsHandler from '../src/api-lib/handlers/ops.js';
import parseJdHandler from '../src/api-lib/handlers/parse-jd.js';
import publicCandidateResumeHandler from '../src/api-lib/handlers/public-candidate-resume.js';
import publicHandler from '../src/api-lib/handlers/public.js';
import reactivationHandler from '../src/api-lib/handlers/reactivation.js';
import rebuildMatrixHandler from '../src/api-lib/handlers/rebuild-matrix.js';
import recruiterOsHandler from '../src/api-lib/handlers/recruiter-os.js';
import repairCandidatesHandler from '../src/api-lib/handlers/repair-candidates.js';
import rescanMatchesHandler from '../src/api-lib/handlers/rescan-matches.js';
import rescanResumeHandler from '../src/api-lib/handlers/rescan-resume.js';
import resumeLedgerHandler from '../src/api-lib/handlers/resume-ledger.js';
import rufloHandler from '../src/api-lib/handlers/ruflo.js';
import searchCandidatesHandler from '../src/api-lib/handlers/search-candidates.js';
import submissionsHandler from '../src/api-lib/handlers/submissions.js';
import syncRequirementsHandler from '../src/api-lib/handlers/sync-requirements.js';
import userAdminHandler from '../src/api-lib/handlers/user-admin.js';
import userHandler from '../src/api-lib/handlers/user.js';
import validateSubmissionHandler from '../src/api-lib/handlers/validate-submission.js';
import workflowsHandler from '../src/api-lib/handlers/workflows.js';
import workspaceHandler from '../src/api-lib/handlers/workspace.js';

// --- DETERMINISTIC HANDLER REGISTRY ---
const EXACT_HANDLER_REGISTRY: Record<string, any> = {
  admin: adminHandler,
  candidates: candidatesHandler,
  'user-admin': userAdminHandler,
  'create-user': userAdminHandler,
  'assign-role': userAdminHandler,
  'deactivate-user': userAdminHandler,
  'reactivate-user': userAdminHandler,
  'executive-metrics': executiveMetricsHandler,
  'rescan-matches': rescanMatchesHandler,
  'client-candidate': clientCandidateHandler,
  'client-submissions': clientSubmissionsHandler,
  'client-ai-matches': clientAiMatchesHandler,
  submissions: submissionsHandler,
  'repair-candidates': repairCandidatesHandler,
  'validate-submission': validateSubmissionHandler,
  'parse-jd': parseJdHandler,
  'extract-text': extractTextHandler,
  'public-candidate-resume': publicCandidateResumeHandler,
  'match-detailed': matchDetailedHandler,
  'match-candidates-detailed': matchDetailedHandler,
  'matching-global': matchingGlobalHandler,
  'bulk-parse': bulkParseResumesHandler,
  'bulk-parse-resumes': bulkParseResumesHandler,
  interviews: interviewsHandler,
  intel: intelHandler,
  analytics: analyticsHandler,
  user: userHandler,
  workflows: workflowsHandler,
  oauth: oauthHandler,
  google: googleProxyHandler,
  workspace: workspaceHandler,
  cron: cronHandler,
  public: publicHandler,
  communication: communicationHandler,
  billing: billingHandler,
  events: eventsHandler,
  ruflo: rufloHandler,
  'kill-switch': killSwitchHandler,
  'recruiter-os': recruiterOsHandler,
  'daily-briefing': dailyBriefingHandler,
  'sync-requirements': syncRequirementsHandler,
  agents: (async (req: any, res: any) => {
    const mod: any = await import('../src/api-lib/handlers/agents-execute.js');
    return (mod.default || mod)(req, res);
  }) as any,
  'ai-gateway': aiGatewayHandler,
  'ai-health': aiHealthHandler,
  'automation-events': automationEventsHandler,
  'candidate-screen': candidateScreenHandler,
  'candidate-portal': candidatePortalHandler,
  'cleanup-matches': cleanupMatchesHandler,
  integrations: integrationsHandler,
  copilot: copilotHandler,
  'match-health': matchHealthHandler,
  'network-mapping': (async (req: any, res: any, next?: any) => {
    try {
      const mod = await import('../src/api-lib/handlers/network-mapping.js');
      const handler = (mod.default || mod) as any;
      return await handler(req, res, next);
    } catch (err) {
      console.error('[network-mapping] handler initialization failed:', err);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'NETWORK_MAPPING_INITIALIZATION_FAILED',
            message: 'Network mapping service is temporarily unavailable.'
          }
        });
      }
      return;
    }
  }) as any,
  ops: opsHandler,
  reactivation: reactivationHandler,
  'rebuild-matrix': rebuildMatrixHandler,
  'rescan-resume': rescanResumeHandler,
  'resume-ledger': resumeLedgerHandler,
  'search-candidates': searchCandidatesHandler,
};

export default async function handler(req: any, res: any) {
  try {
    const { path } = req.query;
    const action = req.query.action || req.body?.action;

    console.log("=== API INDEX ENTRY ===");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    console.log("Path query:", req.query?.path);

    // --- Authentication ---
    const urlStr = req.url || '';
    
    const isPublic =
      urlStr.includes('/api/public') ||
      urlStr.includes('/api/public-candidate-resume') ||
      urlStr.includes('/api/workspace/gmail/webhook') ||
      urlStr.includes('/api/workspace/whatsapp/webhook') ||
      urlStr.includes('/ruflo/health') ||
      path === 'ruflo/health' ||
      path === 'public-candidate-resume' ||
      path?.startsWith('public');
      
    if (isPublic) {
      console.log("PUBLIC ROUTE BYPASS ACTIVATED");
    }

    // Vercel Cron Jobs (configured via vercel.json's `crons` key) invoke their
    // target URL directly with `Authorization: Bearer $CRON_SECRET` (Vercel's
    // own convention) — they have no Firebase user to sign in as, so they can
    // never satisfy the normal Bearer-ID-token check below. Recognize that
    // specific header value as an authorized system caller for cron routes
    // only, while leaving manual/interactive calls to those same routes
    // (e.g. an admin clicking "Refresh" in the UI) to authenticate normally
    // with their real Firebase ID token as before.
    const cronSecret = process.env.CRON_SECRET;
    const cronAuthHeader = req.headers.authorization;
    const isAuthorizedCronCall =
      !!cronSecret &&
      path?.startsWith('cron') &&
      cronAuthHeader === `Bearer ${cronSecret}`;

    if (path !== 'audit' && !path?.startsWith('sync-requirements') && !urlStr.includes('/oauth/callback') && !urlStr.includes('/oauth/url') && !urlStr.includes('/api/oauth/url') && !isPublic && !isAuthorizedCronCall) {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        console.log("AUTH MIDDLEWARE REJECTING - No token provided", { url: req.url, path });
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }
      if (adminAuth) {
         try {
            const decoded = await adminAuth.verifyIdToken(token);
            req.user = decoded;

            // Fallback enrichment: if custom claims are missing from the token, fetch from Firestore SSOT
            if (adminDb && req.user && (!req.user.role || !req.user.organizationId)) {
              try {
                const userDoc = await adminDb.collection("users").doc(req.user.uid).get();
                if (userDoc.exists) {
                  const data = userDoc.data();
                  if (data) {
                    if (!req.user.role && data.role) {
                      req.user.role = data.role;
                    }
                    if (!req.user.organizationId && (data.organizationId || data.orgId)) {
                      req.user.organizationId = data.organizationId || data.orgId;
                    }
                  }
                }
              } catch (enrichErr: any) {
                console.warn("[Auth Middleware] Firestore enrichment skipped:", enrichErr.message);
              }
            }
         } catch (err: any) {
            console.error('Auth Error:', err); return res.status(401).json({ error: 'Unauthorized: Invalid token', details: err.message });
         }
      } else {
         req.user = { uid: 'dev-mode' };
      }
    } else if (isAuthorizedCronCall) {
      req.user = { uid: 'system-cron' };
    }

    console.log({
        originalUrl: req.originalUrl,
        url: req.url,
        path,
        action
    });
    console.log("Matched API path:", path);

    // --- Deterministic Handler Lookup ---
    let targetHandler: any = null;

    if (path && EXACT_HANDLER_REGISTRY[path]) {
      targetHandler = EXACT_HANDLER_REGISTRY[path];
    } else if (path?.startsWith('network-mapping/')) {
      targetHandler = EXACT_HANDLER_REGISTRY['network-mapping'];
    } else if (path?.startsWith('user-admin/')) {
      targetHandler = userAdminHandler;
    } else if (path?.startsWith('submissions/')) {
      targetHandler = submissionsHandler;
    } else if (path?.startsWith('agents/')) {
      targetHandler = (async (req: any, res: any) => {
        const mod: any = await import('../src/api-lib/handlers/agents-execute.js');
        return (mod.default || mod)(req, res);
      }) as any;
    } else if (path?.startsWith('oauth')) {
      targetHandler = oauthHandler;
    } else if (path?.startsWith('google')) {
      targetHandler = googleProxyHandler;
    } else if (path?.startsWith('workspace')) {
      targetHandler = workspaceHandler;
    } else if (path?.startsWith('cron')) {
      targetHandler = cronHandler;
    } else if (path?.startsWith('public')) {
      targetHandler = publicHandler;
    } else if (path?.startsWith('communication')) {
      targetHandler = communicationHandler;
    } else if (path?.startsWith('billing')) {
      targetHandler = billingHandler;
    } else if (path?.startsWith('events')) {
      targetHandler = eventsHandler;
    } else if (path?.startsWith('ruflo')) {
      targetHandler = rufloHandler;
    } else if (path?.startsWith('kill-switch')) {
      targetHandler = killSwitchHandler;
    } else if (path?.startsWith('recruiter-os')) {
      targetHandler = recruiterOsHandler;
    } else if (path?.startsWith('executive-metrics')) {
      targetHandler = executiveMetricsHandler;
    } else if (path?.startsWith('daily-briefing')) {
      targetHandler = dailyBriefingHandler;
    } else if (path?.startsWith('sync-requirements')) {
      targetHandler = syncRequirementsHandler;
    } else if (path?.startsWith('ops/')) {
      req.path = '/' + path;
      targetHandler = opsHandler;
    } else if (action) {
      // Fallback based on `action` parameter if `path` was generic or rewrite-mapped
      switch (action) {
        case 'candidates':
        case 'all-candidates':
          targetHandler = candidatesHandler;
          break;
        case 'rescan-matches':
          targetHandler = rescanMatchesHandler;
          break;
        case 'candidate':
          targetHandler = clientCandidateHandler;
          break;
        case 'submissions':
          targetHandler = clientSubmissionsHandler;
          break;
        case 'repair':
          targetHandler = repairCandidatesHandler;
          break;
        case 'validate-submission':
          targetHandler = validateSubmissionHandler;
          break;
        case 'parse-jd':
          targetHandler = parseJdHandler;
          break;
        case 'extract-text':
          targetHandler = extractTextHandler;
          break;
        case 'public-candidate-resume':
          targetHandler = publicCandidateResumeHandler;
          break;
        case 'match-detailed':
          targetHandler = matchDetailedHandler;
          break;
        case 'bulk-parse':
        case 'bulk-parse-resumes':
          targetHandler = bulkParseResumesHandler;
          break;
        case 'create':
        case 'delete':
        case 'assign':
        case 'context':
          targetHandler = userHandler;
          break;
        default:
          targetHandler = adminHandler;
          break;
      }
    } else {
      targetHandler = adminHandler;
    }

    if (targetHandler) {
      const expressRouters = [
        'oauth', 
        'google', 
        'workspace', 
        'cron', 
        'communication',
        'billing',
        'events',
        'ruflo',
        'kill-switch',
        'recruiter-os',
        'executive-metrics',
        'daily-briefing',
        'sync-requirements',
        'network-mapping'
      ];
      const matchedRouter = expressRouters.find(r => path?.startsWith(r));
      if (matchedRouter) {
        // Rewrite req.url so the Express Router matches it
        const originalUrl = req.originalUrl || req.url;
        let subPath = path.replace(new RegExp(`^${matchedRouter}`), "");
        if (!subPath.startsWith('/')) {
            subPath = '/' + subPath;
        }
        if (subPath === '/' && action) {
           subPath = '/' + action; // Fallback if action is provided but path was just the router name
        }
        
        const qsIndex = originalUrl.indexOf('?');
        const qs = qsIndex > -1 ? originalUrl.slice(qsIndex) : '';
        req.url = subPath + (subPath.includes('?') ? '' : qs);
        
        return new Promise((resolve, reject) => {
          let completed = false;
          const finish = (val?: any) => {
             if (completed) return;
             completed = true;
             resolve(val);
          };
          const fail = (err: any) => {
             if (completed) return;
             completed = true;
             reject(err);
          };

          const originalEnd = res.end;
          res.end = function (...args: any[]) {
            finish(undefined);
            return originalEnd.apply(this, args);
          };

          targetHandler(req, res, (err: any) => {
            req.url = originalUrl; // Restore just in case
            if (err) return fail(err);
            finish(res.status(404).json({ error: "Route not found in Express Router" }));
          });
        });
      }
      return await targetHandler(req, res);
    }

    return res.status(200).json({ success: true, message: "api/index alive but no handler matched" });
  } catch (err: any) {
    console.error("VERCEL_API_ERROR_CAUGHT:", err);
    return res.status(500).json({ success: false, error: String(err.message || err.toString()), stack: err.stack });
  }
}

