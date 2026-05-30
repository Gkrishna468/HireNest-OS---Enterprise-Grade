const fs = require('fs');
const path = require('path');

const replacements = {
    'Agent HQ': 'AI Assistant',
    'RAG Intelligence': 'Knowledge Search',
    'Memory Map': 'Relationship Intelligence',
    'memory map': 'relationship intelligence',
    'System Trace': 'Activity Timeline',
    'Financial Ledger': 'Revenue Operations',
    'Operational Health': 'Platform Health'
};

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;
            for (const [key, val] of Object.entries(replacements)) {
                if (content.includes(key)) {
                    content = content.split(key).join(val);
                    updated = true;
                }
            }
            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'src', 'views'));
