import syncRequirementsHandler from '../src/api-lib/handlers/sync-requirements.js';

// Polyfill DOMMatrix for serverless runtime
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-system-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure subpath is root for Express router
  req.url = '/';

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
      syncRequirementsHandler(req, res, (err: any) => {
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
