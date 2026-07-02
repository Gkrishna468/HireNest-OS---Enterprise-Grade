import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');

const importTarget = `import workspaceHandler from './src/api-lib/handlers/workspace';`;
const newImport = `import workspaceHandler from './src/api-lib/handlers/workspace';\nimport whatsappHandler from './src/api-lib/handlers/whatsapp';`;

const routeTarget = `  app.use('/api/workspace', workspaceHandler);`;
const newRoute = `  app.use('/api/workspace', workspaceHandler);\n  app.use('/api/whatsapp', whatsappHandler);`;

let newContent = content;
if (content.includes(importTarget)) {
  newContent = newContent.replace(importTarget, newImport);
} else {
  console.log("Import target not found!");
}

if (content.includes(routeTarget)) {
  newContent = newContent.replace(routeTarget, newRoute);
} else {
  console.log("Route target not found!");
}

fs.writeFileSync('server.ts', newContent);
console.log("Successfully patched server.ts");
