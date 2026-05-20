import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  app.use(express.json());

  // API Route Handler
  app.all('/api/*', async (req, res) => {
    const apiRawPath = req.path.replace(/^\/api\//, '');
    const apiPath = apiRawPath.split('?')[0];
    
    // Detailed logging for debugging
    console.log(`[API_MAP] Path: ${apiPath} (Full: ${req.path})`);

    // Consolidated routing map for Vercel Hobby limits
    const consolidatedMap: Record<string, string> = {
      'create-user': 'user.ts',
      'delete-user': 'user.ts',
      'assign-role': 'user.ts',
      'user-context': 'user.ts',
      'metrics': 'admin.ts',
      'diagnostics': 'admin.ts',
      'governance-data': 'admin.ts',
      'pre-flight': 'admin.ts',
      'approve-request': 'admin.ts',
      'onboard-request': 'admin.ts',
      'governance': 'admin.ts',
      'user-candidates': 'candidates.ts',
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
