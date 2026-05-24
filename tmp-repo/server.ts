import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  app.set('trust proxy', 1); // Trust first proxy (required by express-rate-limit behind reverse proxy like Cloud Run)
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

  // --- Auth Middleware ---
  const verifyAuth = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      // Dynamically import adminAuth to avoid module resolution issues
      const { adminAuth } = await import(path.join(__dirname, 'src', 'lib', 'firebase-admin.ts'));
      
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

    // Consolidated routing map for Vercel Hobby limits
    const consolidatedMap: Record<string, string> = {
      'create-user': 'user.ts',
      'user/create': 'user.ts',
      'delete-user': 'user.ts',
      'user/delete': 'user.ts',
      'assign-role': 'user.ts',
      'user/assign-role': 'user.ts',
      'user-context': 'user.ts',
      'user/context': 'user.ts',
      'matching/global': 'matching-global.ts',
      'metrics': 'admin.ts',
      'admin/metrics': 'admin.ts',
      'diagnostics': 'admin.ts',
      'admin/diagnostics': 'admin.ts',
      'governance-data': 'admin.ts',
      'admin/governance-data': 'admin.ts',
      'pre-flight': 'admin.ts',
      'admin/pre-flight': 'admin.ts',
      'approve-request': 'admin.ts',
      'admin/approve-request': 'admin.ts',
      'onboard-request': 'admin.ts',
      'admin/onboard-request': 'admin.ts',
      'governance': 'admin.ts',
      'admin/governance': 'admin.ts',
      'admin/notify-approval': 'admin.ts',
      'admin/approve-requirement': 'admin.ts',
      'admin/notifications': 'admin.ts',
      'user-candidates': 'candidates.ts',
      'user/candidates': 'candidates.ts',
      'deal-intelligence': 'intel.ts'
    };

    const possibleFiles = [
      consolidatedMap[apiPath] || '',
      apiPath + '.ts',
      apiPath + '/index.ts',
      // Dynamic mapping for common path patterns
      apiPath.replace(/\//g, '-') + '.ts',
      apiPath.replace('admin/', '') + '.ts',
      apiPath.replace('user/', 'user-') + '.ts',
      apiPath.replace('user/', '') + '.ts',
      apiPath.replace('deal/', 'deal-') + '.ts',
      apiPath.split('/').pop() + '.ts' // Final fallback: just the filename
    ].filter(Boolean);

    let found = false;
    for (const file of possibleFiles) {
      const filePath = path.join(__dirname, 'api', file);
      if (fs.existsSync(filePath)) {
        try {
          // Use absolute path for import and add cache-buster for dev
          const module = await import(`file://${filePath}?t=${Date.now()}`);
          const handler = module.default;
          if (typeof handler === 'function') {
            console.log(`[API_MAP] Resolved to: ${file}`);
            req.query = { ...req.query, ...req.params };
            await handler(req, res);
            found = true;
            break;
          }
        } catch (err: any) {
          console.error(`[API_ERR] Execution failed [${file}]:`, err);
          return res.status(500).json({ error: 'Internal Server Error', details: err.message, file });
        }
      }
    }

    if (!found) {
      console.warn(`[API_404] No handler found for: ${apiPath}. Tried: ${possibleFiles.join(', ')}`);
      res.status(404).json({ error: `API Route /api/${apiPath} not found`, options: possibleFiles });
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
