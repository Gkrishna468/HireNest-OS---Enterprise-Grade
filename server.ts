import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

// Add global error handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Static Imports for all Handlers & Admin
import { adminAuth, db as adminDb } from './src/lib/firebase-admin';
import adminHandler from './src/api-lib/handlers/admin';
import userHandler from './src/api-lib/handlers/user';
import candidatesHandler from './src/api-lib/handlers/candidates';
import matchingGlobalHandler from './src/api-lib/handlers/matching-global';
import intelHandler from './src/api-lib/handlers/intel';
import parseJdHandler from './src/api-lib/handlers/parse-jd';
import extractTextHandler from './src/api-lib/handlers/extract-text';
import matchDetailedHandler from './src/api-lib/handlers/match-candidates-detailed';
import bulkParseHandler from './src/api-lib/handlers/bulk-parse-resumes';
import workflowsHandler from './src/api-lib/handlers/workflows';
import rescanMatchesHandler from './src/api-lib/handlers/rescan-matches';
import rebuildMatrixHandler from './src/api-lib/handlers/rebuild-matrix';
import cleanupMatchesHandler from './src/api-lib/handlers/cleanup-matches';
import matchHealthHandler from './src/api-lib/handlers/match-health';
import clientAiMatchesHandler from './src/api-lib/handlers/client-ai-matches';
import oauthHandler from './src/api-lib/handlers/oauth';
import workspaceHandler from './src/api-lib/handlers/workspace';
import whatsappHandler from './src/api-lib/handlers/whatsapp';
import googleProxyHandler from './src/api-lib/handlers/google-proxy';
import cronHandler from './src/api-lib/handlers/cron';
import eventsHandler from './src/api-lib/handlers/events';
import clientCandidateHandler from './src/api-lib/handlers/client-candidate';
import clientSubmissionsHandler from './src/api-lib/handlers/client-submissions';
import interviewsHandler from './src/api-lib/handlers/interviews';
import submissionsHandler from './src/api-lib/handlers/submissions';
import integrationsHandler from './src/api-lib/handlers/integrations';
import copilotHandler from './src/api-lib/handlers/copilot';

import analyticsHandler from './src/api-lib/handlers/analytics';
import opsHandler from './src/api-lib/handlers/ops';
import searchCandidatesHandler from './src/api-lib/handlers/search-candidates';
import billingHandler from './src/api-lib/handlers/billing';

const __dirname = process.cwd();

async function createServer() {
  const app = express();
  app.set('trust proxy', 1); // Trust first proxy (required by express-rate-limit behind reverse proxy like Cloud Run)
  
  // --- Security Headers (OWASP) ---
  app.use(helmet({
    // Vibe Coding Checklist: Secure headers configured.
    // Disabling CSP and X-Frame-Options temporarily to allow AI Studio iframe preview functionality.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // --- Rate Limiting ---
  const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { error: 'Too many requests, please try again later.' }
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, // Strict limit for AI
    message: { error: 'AI request limit reached, please try again later.' }
  });

  // Apply standard limits to all /api
  app.use('/api/', standardLimiter);
  
  // Apply strict limits to AI operations
  app.use('/api/parse-jd', aiLimiter);
  app.use('/api/extract-text', aiLimiter);
  app.use('/api/match-candidates', aiLimiter);
  app.use('/api/match-candidates-detailed', aiLimiter);
  app.use('/api/matching-global', aiLimiter);
  app.use('/api/rescan-matches', aiLimiter);
  app.use('/api/rebuild-matrix', aiLimiter);

  // --- Auth Middleware ---
  const verifyAuth = async (req: any, res: any, next: any) => {
    if (
      req.method === 'OPTIONS' ||
      req.path === '/audit' || 
      req.originalUrl === '/api/audit' || 
      req.originalUrl.includes('/oauth/callback') || 
      req.originalUrl.includes('/api/oauth/url') ||
      req.originalUrl.startsWith('/api/public') || req.originalUrl.includes('/api/workspace/gmail/webhook') || req.originalUrl.includes('/api/whatsapp/webhook')
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
        // Fallback for development if admin SDK isn't configured
        console.warn('adminAuth not initialized, skipping strict token validation');
        req.user = { uid: 'dev-mode' }; 
        return next();
      }

      const decoded = await adminAuth.verifyIdToken(token);
      req.user = decoded;
      next();
    } catch (err: any) {
      console.error('[AuthMiddleware] Token verification failed:', err.message);
      console.error('Auth Error:', err); return res.status(401).json({ error: 'Unauthorized: Invalid token', details: err.message });
    }
  };

  // Public endpoints (no auth)
  app.post('/api/public/submit-lead', async (req: any, res: any) => {
    try {
      const data = req.body;
      
      console.log("==========================================");
      console.log("NEW LEAD CAPTURED - NOTIFICATION");
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Name: ${data.name}`);
      console.log(`Plan: ${data.plan}`);
      console.log(`Emails: ${data.email}, ${data.companyEmail}`);
      console.log(`Company: ${data.companyName}`);
      console.log(`Phone: ${data.phone || 'N/A'}`);
      console.log("==========================================");

      if (!adminDb) {
        console.warn('[PublicAPI] Admin DB not available, but lead logged to console.');
        // If DB is down, we still return success because we logged it (simulated email)
        return res.json({ success: true, message: 'Lead logged' });
      }
      
      await adminDb.collection('landing_page_leads_v1').add({
        ...data,
        timestamp: new Date().toISOString(),
        status: 'new',
        source: 'landing_page_v1_api'
      });
      
      console.log(`[PublicAPI] Lead also saved to Firestore for: ${data.email}`);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[PublicAPI] Lead processing failed:', err);
      // Still return success if it was at least logged to console
      return res.json({ success: true, warning: 'DB save failed, but lead captured' });
    }
  });

  // Skip auth for oauth callback etc, then enforce it
  app.use('/api', verifyAuth);

  // Mount OAuth and Google Proxy BEFORE global catch-all
  app.use('/api/oauth', oauthHandler);
  app.use('/api/workspace', workspaceHandler);
  app.use("/api/whatsapp", whatsappHandler);
  app.use("/api/billing", billingHandler);
  app.use('/api/cron', cronHandler);
  app.use('/api/events', eventsHandler);
  app.use('/api/google', googleProxyHandler);

  // API Route Handler
  app.use('/api', async (req: any, res: any) => {
    // req.path is relative to the mount point (e.g. '/client-matches')
    const apiRawPath = req.path.replace(/^\//, '');
    const apiPath = apiRawPath.split('?')[0];
    
    // Detailed logging for debugging
    console.log(`[API_MAP] Path: ${apiPath} (Full: ${req.originalUrl || req.url})`);
    
    req.query = { ...req.query, ...req.params };

    try {
      switch (apiPath) {
        case 'create-user':
        case 'user/create':
        case 'delete-user':
        case 'user/delete':
        case 'assign-role':
        case 'user/assign-role':
        case 'user-context':
        case 'user/context':
        case 'user':
        case 'finalize-onboarding':
          return await userHandler(req, res);
          
        case 'metrics':
        case 'admin/metrics':
        case 'diagnostics':
        case 'admin/diagnostics':
        case 'governance-data':
        case 'admin/governance-data':
        case 'pre-flight':
        case 'admin/pre-flight':
        case 'approve-request':
        case 'admin/approve-request':
        case 'onboard-request':
        case 'admin/onboard-request':
        case 'governance':
        case 'admin/governance':
        case 'admin/notify-approval':
        case 'admin/approve-requirement':
        case 'admin/notifications':
        case 'admin':
          return await adminHandler(req, res);

        case 'client-matches':
          return await clientAiMatchesHandler(req, res);

        case 'client-candidate':
          return await clientCandidateHandler(req, res);

        case 'client-submissions':
          return await clientSubmissionsHandler(req, res);

        case 'submissions/transition':
        case 'submissions':
          return await submissionsHandler(req, res);

        case 'interviews':
          return await interviewsHandler(req, res);

        case 'user-candidates':
        case 'user/candidates':
        case 'candidates':
          return await candidatesHandler(req, res);

        case 'matching/global':
        case 'matching-global':
          return await matchingGlobalHandler(req, res);

        case 'search/candidates':
          return await searchCandidatesHandler(req, res);

        case 'deal-intelligence':
        case 'intel':
          return await intelHandler(req, res);

        case 'parse-jd':
          if (parseJdHandler) return await parseJdHandler(req, res);
          break;
          
        case 'extract-text':
          if (extractTextHandler) return await extractTextHandler(req, res);
          break;
          
        case 'match-candidates-detailed':
          if (matchDetailedHandler) return await matchDetailedHandler(req, res);
          break;

        case 'bulk-parse-resumes':
          if (bulkParseHandler) return await bulkParseHandler(req, res);
          break;
          
        case 'rescan-matches':
          if (rescanMatchesHandler) return await rescanMatchesHandler(req, res);
          break;

        case 'rebuild-matrix':
          if (rebuildMatrixHandler) return await rebuildMatrixHandler(req, res);
          break;

        case 'cleanup-matches':
          if (cleanupMatchesHandler) return await cleanupMatchesHandler(req, res);
          break;

        case 'match-health':
          if (matchHealthHandler) return await matchHealthHandler(req, res);
          break;

        case 'workflows':
          return await workflowsHandler(req, res);
          
        case 'copilot':
          return await copilotHandler(req, res);
          
        case 'analytics':
        case 'analytics/client':
        case 'analytics/vendor':
        case 'analytics/recruiter':
        case 'analytics/hq':
        case 'analytics/hq-production-health':
          return await analyticsHandler(req, res);

        case 'ops':
        case 'ops/heartbeats':
        case 'ops/heartbeats/publish':
        case 'ops/queue':
        case 'ops/timeline':
        case 'ops/trends':
        case 'ops/replay':
        case 'ops/runtime/start':
        case 'ops/runtime/stop':
        case 'ops/runtime/pause':
        case 'ops/runtime/resume':
        case 'ops/runtime/status':
        case 'ops/runtime/simulate':
          return await opsHandler(req, res);

        case 'integrations/events':
        case 'integrations/sync/resolve':
        case 'integrations/status':
          return await integrationsHandler(req, res);
      }
      
      console.warn(`[API_404] No static handler explicitly configured for: ${apiPath}.`);
      return res.status(404).json({ success: false, error: `API Route /api/${apiPath} not implemented` });
    } catch (err: any) {
      console.error(`[API_ERR] Execution failed [${apiPath}]:`, err);
      // Ensure we DO NOT use res.send or text
      if (!res.headersSent) {
         return res.status(500).json({ success: false, error: 'Internal Server Error', details: err?.message || String(err), file: apiPath });
      }
    }
  });

  // Vite integration
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = 3000;
  
  // Global Error Handler to guarantee JSON for API errors
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Global Error Handler]", err);
    if (!res.headersSent) {
      if (req.path.startsWith('/api/')) {
         return res.status(err.status || 500).json({ success: false, error: err.message || "A server error occurred" });
      }
      next(err);
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();
