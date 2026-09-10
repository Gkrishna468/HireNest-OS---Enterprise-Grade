import rufloHandler from '../src/api-lib/handlers/ruflo.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rewrite URL if path query exists, or default to health check
  const action = req.query?.action || (req.url?.includes('health') ? 'health' : 'health');
  req.url = `/${action}`;

  return new Promise((resolve, reject) => {
    let completed = false;
    const finish = (val?: any) => {
      if (completed) return;
      completed = true;
      resolve(val);
    };

    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      finish(undefined);
      return originalEnd.apply(this, args);
    };

    try {
      rufloHandler(req, res, (err: any) => {
        if (err) {
          if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Internal Server Error' });
          }
          return finish(err);
        }
        finish();
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
      finish(err);
    }
  });
}
