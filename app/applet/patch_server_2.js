const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');
c = c.replace(
  "req.originalUrl.startsWith('/api/public')",
  "req.originalUrl.startsWith('/api/public') || req.originalUrl.includes('/api/workspace/gmail/webhook') || req.originalUrl.includes('/api/whatsapp/webhook')"
);
fs.writeFileSync('server.ts', c, 'utf8');
console.log('patched server.ts');
