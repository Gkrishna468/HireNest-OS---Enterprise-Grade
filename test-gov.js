import handler from './api/admin.ts';
const req = { path: '/api/governance', query: { action: 'governance' }, body: {} };
const res = { 
  status: (c) => ({ json: (d) => console.log('Response:', c, "DATA_KEYS:", Object.keys(d)) }),
  json: (d) => console.log('Response DATA_KEYS:', Object.keys(d))
};
handler(req, res).catch(console.error);
