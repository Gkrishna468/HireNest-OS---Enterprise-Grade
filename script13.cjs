const fs = require('fs');
let c = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

c = c.replace(/"\n\n=== Merged Context ===\n"/g, '"\\\\n\\\\n=== Merged Context ===\\\\n"');

fs.writeFileSync('src/views/CandidatesTab.tsx', c);
console.log('Fixed multiline strings');
