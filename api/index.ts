import { adminAuth } from '../src/lib/firebase-admin.js';

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
      urlStr.includes('/api/public') || urlStr.includes('/api/workspace/gmail/webhook') || urlStr.includes('/api/whatsapp/webhook') || 
      path?.startsWith('public');
      
    if (isPublic) {
      console.log("PUBLIC ROUTE BYPASS ACTIVATED");
    }

    if (path !== 'audit' && !urlStr.includes('/oauth/callback') && !urlStr.includes('/oauth/url') && !urlStr.includes('/api/oauth/url') && !isPublic) {
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
    }

    console.log({
        originalUrl: req.originalUrl,
        url: req.url,
        path,
        action
    });
    console.log("Matched API path:", path);

    let targetHandler: any;

    if (path === 'admin')            targetHandler = (await import('../src/api-lib/handlers/admin.js')).default;
    else if (path === 'client-candidate') targetHandler = (await import('../src/api-lib/handlers/client-candidate.js')).default;
    else if (path === 'client-submissions') targetHandler = (await import('../src/api-lib/handlers/client-submissions.js')).default;
    else if (path === 'repair-candidates') targetHandler = (await import('../src/api-lib/handlers/repair-candidates.js')).default;
    else if (path === 'validate-submission') targetHandler = (await import('../src/api-lib/handlers/validate-submission.js')).default;
    else if (path === 'parse-jd')          targetHandler = (await import('../src/api-lib/handlers/parse-jd.js')).default;
    else if (path === 'extract-text')      targetHandler = (await import('../src/api-lib/handlers/extract-text.js')).default;
    else if (path === 'match-detailed')    targetHandler = (await import('../src/api-lib/handlers/match-candidates-detailed.js')).default;
    else if (path === 'bulk-parse')        targetHandler = (await import('../src/api-lib/handlers/bulk-parse-resumes.js')).default;
    else if (path === 'interviews')        targetHandler = (await import('../src/api-lib/handlers/interviews.js')).default;
    else if (path === 'intel')             targetHandler = (await import('../src/api-lib/handlers/intel.js')).default;
    else if (path === 'analytics')         targetHandler = (await import('../src/api-lib/handlers/analytics.js')).default;
    else if (path === 'user')              targetHandler = (await import('../src/api-lib/handlers/user.js')).default;
    else if (path === 'workflows')         targetHandler = (await import('../src/api-lib/handlers/workflows.js')).default;
    else if (path?.startsWith('oauth'))    targetHandler = (await import('../src/api-lib/handlers/oauth.js')).default;
    else if (path?.startsWith('google'))   targetHandler = (await import('../src/api-lib/handlers/google-proxy.js')).default;
    else if (path?.startsWith('workspace')) targetHandler = (await import('../src/api-lib/handlers/workspace.js')).default;
    else if (path?.startsWith('whatsapp')) targetHandler = (await import('../src/api-lib/handlers/whatsapp.js')).default;
    else if (path?.startsWith('cron'))      targetHandler = (await import('../src/api-lib/handlers/cron.js')).default;
    else if (path?.startsWith('public'))    targetHandler = (await import('../src/api-lib/handlers/public.js')).default;
    else {
      // Provide fallback based on `action` parameter if `path` is not exactly one of the above.
      switch (action) {
        case 'candidate': targetHandler = (await import('../src/api-lib/handlers/client-candidate.js')).default; break;
        case 'submissions': targetHandler = (await import('../src/api-lib/handlers/client-submissions.js')).default; break;
        case 'repair': targetHandler = (await import('../src/api-lib/handlers/repair-candidates.js')).default; break;
        case 'validate-submission': targetHandler = (await import('../src/api-lib/handlers/validate-submission.js')).default; break;
        case 'parse-jd': targetHandler = (await import('../src/api-lib/handlers/parse-jd.js')).default; break;
        case 'extract-text': targetHandler = (await import('../src/api-lib/handlers/extract-text.js')).default; break;
        case 'match-detailed': targetHandler = (await import('../src/api-lib/handlers/match-candidates-detailed.js')).default; break;
        case 'bulk-parse': targetHandler = (await import('../src/api-lib/handlers/bulk-parse-resumes.js')).default; break;
        default: targetHandler = (await import('../src/api-lib/handlers/admin.js')).default; break;
      }
    }

    if (targetHandler) {
      const expressRouters = ['oauth', 'google', 'workspace', 'whatsapp', 'cron'];
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

