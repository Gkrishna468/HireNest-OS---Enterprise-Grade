const fs = require('fs');

let content = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

// The file has actual newlines inside double-quotes which breaks TS syntax.
// We must convert real newlines inside double-quotes back to \n.
// The easiest way is to specifically target the exact broken code blocks:

content = content.replace(/"\\n\\n=== Merged Context ===\\n"/g, '"\\n\\n=== Merged Context ===\\n"');
content = content.replace(/"\\n\\n=== Merged Context ===\\n"/g, '"\\n\\n=== Merged Context ===\\n"');

// Actually wait, let's just do a specific string replace:
content = content.replace(/"\n\n=== Merged Context ===\n"/g, '"\\n\\n=== Merged Context ===\\n"');

fs.writeFileSync('src/views/CandidatesTab.tsx', content);
console.log("Fixed newlines in string literals");
