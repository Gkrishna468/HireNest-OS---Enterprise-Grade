const fs = require('fs');
let c = fs.readFileSync('api/index.ts', 'utf8');
c = c.replace(
  "urlStr.includes('/api/public') ||",
  "urlStr.includes('/api/public') || \n      urlStr.includes('/api/workspace/gmail/webhook') || \n      urlStr.includes('/api/whatsapp/webhook') ||"
);
fs.writeFileSync('api/index.ts', c, 'utf8');
console.log('patched api/index.ts');
