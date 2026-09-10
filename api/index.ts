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

import { adminAuth } from '../src/lib/firebase-admin.js';
import adminHandler from '../src/api-lib/handlers/admin.js';
import candidatesHandler from '../src/api-lib/handlers/candidates.js';
import rescanMatchesHandler from '../src/api-lib/handlers/rescan-matches.js';
import clientCandidateHandler from '../src/api-lib/handlers/client-candidate.js';
import clientSubmissionsHandler from '../src/api-lib/handlers/client-submissions.js';
import repairCandidatesHandler from '../src/api-lib/handlers/repair-candidates.js';
import validateSubmissionHandler from '../src/api-lib/handlers/validate-submission.js';
import parseJdHandler from '../src/api-lib/handlers/parse-jd.js';
import extractTextHandler from '../src/api-lib/handlers/extract-text.js';
import publicCandidateResumeHandler from '../src/api-lib/handlers/public-candidate-resume.js';
import matchDetailedHandler from '../src/api-lib/handlers/match-candidates-detailed.js';
import bulkParseResumesHandler from '../src/api-lib/handlers/bulk-parse-resumes.js';

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

    const loadHandler = async (modulePath: string) => {
      try {
        return (await import(modulePath)).default;
      } catch (err: any) {
        if (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.message?.includes('Cannot find module')) {
          const alternate = modulePath.endsWith('.js')
            ? modulePath.slice(0, -3)
            : `${modulePath}.js`;
          return (await import(alternate)).default;
        }
        throw err;
      }
    };

    let targetHandler: any;

    if (path === 'candidates' || action === 'candidates' || action === 'all-candidates') targetHandler = candidatesHandler;
    else if (path === 'rescan-matches' || action === 'rescan-matches') targetHandler = rescanMatchesHandler;
    else if (path === 'admin')            targetHandler = adminHandler;
    else if (path === 'client-candidate') targetHandler = clientCandidateHandler;
    else if (path === 'client-submissions') targetHandler = clientSubmissionsHandler;
    else if (path === 'repair-candidates') targetHandler = repairCandidatesHandler;
    else if (path === 'validate-submission') targetHandler = validateSubmissionHandler;
    else if (path === 'parse-jd')          targetHandler = parseJdHandler;
    else if (path === 'extract-text')      targetHandler = extractTextHandler;
    else if (path === 'public-candidate-resume' || path === 'public/candidate-resume') targetHandler = publicCandidateResumeHandler;
    else if (path === 'match-detailed')    targetHandler = matchDetailedHandler;
    else if (path === 'bulk-parse' || path === 'bulk-parse-resumes')        targetHandler = bulkParseResumesHandler;
    else if (path === 'interviews')        targetHandler = await loadHandler('../src/api-lib/handlers/interviews.js');
    else if (path === 'intel')             targetHandler = await loadHandler('../src/api-lib/handlers/intel.js');
    else if (path === 'analytics')         targetHandler = await loadHandler('../src/api-lib/handlers/analytics.js');
    else if (path === 'user')              targetHandler = await loadHandler('../src/api-lib/handlers/user.js');
    else if (path === 'workflows')         targetHandler = await loadHandler('../src/api-lib/handlers/workflows.js');
    else if (path?.startsWith('oauth'))    targetHandler = await loadHandler('../src/api-lib/handlers/oauth.js');
    else if (path?.startsWith('google'))   targetHandler = await loadHandler('../src/api-lib/handlers/google-proxy.js');
    else if (path?.startsWith('workspace')) targetHandler = await loadHandler('../src/api-lib/handlers/workspace.js');
    else if (path?.startsWith('cron'))      targetHandler = await loadHandler('../src/api-lib/handlers/cron.js');
    else if (path?.startsWith('public'))    targetHandler = await loadHandler('../src/api-lib/handlers/public.js');
    else if (path?.startsWith('communication')) targetHandler = await loadHandler('../src/api-lib/handlers/communication.js');
    else if (path?.startsWith('billing'))   targetHandler = await loadHandler('../src/api-lib/handlers/billing.js');
    else if (path?.startsWith('events'))    targetHandler = await loadHandler('../src/api-lib/handlers/events.js');
    else if (path?.startsWith('ruflo'))     targetHandler = await loadHandler('../src/api-lib/handlers/ruflo.js');
    else if (path?.startsWith('kill-switch')) targetHandler = await loadHandler('../src/api-lib/handlers/kill-switch.js');
    else if (path?.startsWith('recruiter-os')) targetHandler = await loadHandler('../src/api-lib/handlers/recruiter-os.js');
    else if (path?.startsWith('executive-metrics')) targetHandler = await loadHandler('../src/api-lib/handlers/executive-metrics.js');
    else if (path?.startsWith('daily-briefing')) targetHandler = await loadHandler('../src/api-lib/handlers/daily-briefing.js');
    else if (path === 'sync-requirements' || path?.startsWith('sync-requirements')) targetHandler = await loadHandler('../src/api-lib/handlers/sync-requirements.js');
    else if (path === 'agents' || path?.startsWith('agents/')) targetHandler = await loadHandler('../src/api-lib/handlers/agents-execute.js');
    else if (path === 'ops' || path?.startsWith('ops/')) {
      req.path = '/' + path;
      targetHandler = await loadHandler('../src/api-lib/handlers/ops.js');
    }
    else {
      // Provide fallback based on `action` parameter if `path` is not exactly one of the above.
      switch (action) {
        case 'candidate': targetHandler = clientCandidateHandler; break;
        case 'submissions': targetHandler = clientSubmissionsHandler; break;
        case 'repair': targetHandler = repairCandidatesHandler; break;
        case 'validate-submission': targetHandler = validateSubmissionHandler; break;
        case 'parse-jd': targetHandler = parseJdHandler; break;
        case 'extract-text': targetHandler = extractTextHandler; break;
        case 'public-candidate-resume': targetHandler = publicCandidateResumeHandler; break;
        case 'match-detailed': targetHandler = matchDetailedHandler; break;
        case 'bulk-parse':
        case 'bulk-parse-resumes': targetHandler = bulkParseResumesHandler; break;
        default: targetHandler = adminHandler; break;
      }
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
        'sync-requirements'
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

