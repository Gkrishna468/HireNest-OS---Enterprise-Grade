import fs from 'fs';
import path from 'path';

const apiDir = path.join(process.cwd(), 'api');
const files = fs.readdirSync(apiDir);
for (const file of files) {
  if (file.endsWith('.ts')) {
    fs.unlinkSync(path.join(apiDir, file));
  }
}
console.log('Deleted all files in api directory');
