import extractTextHandler from '../src/api-lib/handlers/extract-text.js';

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

export const config = {
  api: {
    bodyParser: false, // Disabling bodyParser to let multer stream multipart/form-data
  },
};

export default async function handler(req: any, res: any) {
  const allowedOrigins = ['https://os.hirenestworkforce.com', 'https://hirenestworkforce.com', 'http://localhost:3000', 'http://localhost:5173'];
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
      const result = (extractTextHandler as any)(req, res);
      if (result && typeof result.then === 'function') {
        result.then(() => finish()).catch((err: any) => {
          if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Internal Server Error' });
          }
          finish(err);
        });
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
      finish(err);
    }
  });
}
