import fs from 'fs';
import path from 'path';

const serverFile = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

content = content.replace(/import (.*) from '\.\/api\/(.*)';/g, "import $1 from './src/api-lib/handlers/$2';");

fs.writeFileSync(serverFile, content, 'utf8');
console.log('Updated server.ts imports');
