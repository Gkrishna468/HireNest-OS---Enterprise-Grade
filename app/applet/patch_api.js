const fs = require('fs');

let c = fs.readFileSync('api/index.ts', 'utf8');

c = c.replace(
  "else if (path?.startsWith('workspace')) targetHandler = (await import('../src/api-lib/handlers/workspace.js')).default;",
  "else if (path?.startsWith('workspace')) targetHandler = (await import('../src/api-lib/handlers/workspace.js')).default;\n    else if (path?.startsWith('whatsapp')) targetHandler = (await import('../src/api-lib/handlers/whatsapp.js')).default;"
);

c = c.replace(
  "const expressRouters = ['oauth', 'google', 'workspace', 'cron'];",
  "const expressRouters = ['oauth', 'google', 'workspace', 'whatsapp', 'cron'];"
);

fs.writeFileSync('api/index.ts', c, 'utf8');
console.log('patched api/index.ts');
