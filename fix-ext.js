import fs from 'fs';
import path from 'path';

function fixExtensions(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixExtensions(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            // basic regexp to find local imports without .js 
            content = content.replace(/from\s+['"](\.[^'"]*[^s])['"]/g, (match, p1) => {
                // If it ends with .css, .svg, etc, leave it, but if it doesn't end with .js/.ts, add .js
                if (!p1.endsWith('.js') && !p1.endsWith('.ts') && !p1.endsWith('.css')) {
                    modified = true;
                    return `from '${p1}.js'`;
                }
                return match;
            });

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

fixExtensions('./api');
fixExtensions('./src/api-lib');
