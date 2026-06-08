import fs from 'fs';
import path from 'path';

const apiDir = path.join(process.cwd(), 'api');
const destDir = path.join(process.cwd(), 'src', 'api-lib', 'handlers');

if (fs.existsSync(apiDir)) {
  const files = fs.readdirSync(apiDir);
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const srcPath = path.join(apiDir, file);
      const destPath = path.join(destDir, file);
      
      let content = fs.readFileSync(srcPath, 'utf8');
      content = content.replace(/from\s+["']\.\.\/src\/api-lib\/handlers\//g, 'from "./');
      content = content.replace(/from\s+["']\.\.\/src\//g, 'from "../../');
      
      fs.writeFileSync(destPath, content, 'utf8');
      fs.unlinkSync(srcPath);
      console.log(`Moved ${file} to ${destDir}`);
    }
  }
}
