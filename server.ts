import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Add global error handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Static Imports for all Handlers & Admin
import { adminAuth } from './src/lib/firebase-admin.ts';
import adminHandler from './api/admin.ts';
import userHandler from './api/user.ts';
import candidatesHandler from './src/api-lib/handlers/candidates.ts';
import matchingGlobalHandler from './src/api-lib/handlers/matching-global.ts';
import intelHandler from './api/intel.ts';
import parseJdHandler from './api/parse-jd.ts';
import extractTextHandler from './api/extract-text.ts';
import matchDetailedHandler from './api/match-candidates-detailed.ts';
import bulkParseHandler from './api/bulk-parse-resumes.ts';
import workflowsHandler from './src/api-lib/handlers/workflows.ts';
import rescanMatchesHandler from './src/api-lib/handlers/rescan-matches.ts';
import rebuildMatrixHandler from './src/api-lib/handlers/rebuild-matrix.ts';
import cleanupMatchesHandler from './src/api-lib/handlers/cleanup-matches.ts';
import matchHealthHandler from './src/api-lib/handlers/match-health.ts';
import clientAiMatchesHandler from './src/api-lib/handlers/client-ai-matches.ts';

import analyticsHandler from './api/analytics.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  
  app.use(express.json());

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
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
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
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };

  // Temporarily bypass verifyAuth for certain public routes if any existed, but user requested everywhere
  app.use('/api/*', verifyAuth);

  // API Route Handler
  app.all('/api/*', async (req: any, res: any) => {
    const apiRawPath = req.path.replace(/^\/api\//, '');
    const apiPath = apiRawPath.split('?')[0];
    
    // Detailed logging for debugging
    console.log(`[API_MAP] Path: ${apiPath} (Full: ${req.path})`);
    
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

        case 'user-candidates':
        case 'user/candidates':
        case 'candidates':
          return await candidatesHandler(req, res);

        case 'matching/global':
        case 'matching-global':
          return await matchingGlobalHandler(req, res);

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
          
        case 'analytics/client':
        case 'analytics/vendor':
        case 'analytics/recruiter':
        case 'analytics/hq':
          return await analyticsHandler(req, res);
      }
      
      console.warn(`[API_404] No static handler explicitly configured for: ${apiPath}.`);
      res.status(404).json({ error: `API Route /api/${apiPath} not implemented` });
    } catch (err: any) {
      console.error(`[API_ERR] Execution failed [${apiPath}]:`, err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message, file: apiPath });
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
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();
