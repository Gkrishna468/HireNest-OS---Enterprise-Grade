import fs from 'fs';
import path from 'path';

const apiDir = path.join(process.cwd(), 'api');
const files = fs.readdirSync(apiDir);
for (const file of files) {
  if (file.endsWith('.ts')) {
    const p = path.join(apiDir, file);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/\.js';/g, ".ts';");
    fs.writeFileSync(p, c, 'utf8');
  }
}
console.log("Fixed js extensions to ts");
