const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      content = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, p1) => {
        if (p1.endsWith('.js') || p1.endsWith('.css') || p1.endsWith('.json')) return match;
        changed = true;
        return `from '${p1}.js'`;
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDir('src/api-lib');
console.log('Fixed imports in src/api-lib');
