const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'api', 'lib');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We only want to rewrite those files we just moved, which currently have wrong imports
    // They might be containing `./lib/` -> `./`
    // They might be containing `../src/` -> `../../src/`
    
    let updated = false;
    
    if (content.includes('from "../src/')) {
      content = content.replace(/from "\.\.\/src\//g, 'from "../../src/');
      updated = true;
    }
    
    if (content.includes('from "./lib/')) {
      content = content.replace(/from "\.\/lib\//g, 'from "./');
      updated = true;
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
