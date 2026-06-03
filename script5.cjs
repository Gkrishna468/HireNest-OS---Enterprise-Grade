const fs = require('fs');

let content = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

// The file was joined with literal "\n". Let's replace the literal "\n" with actual newlines.
// Note: we might have broken legit regexes that had literal "\n", but none should be in a normal React component except maybe strings.
content = content.replace(/\\n/g, '\n');

fs.writeFileSync('src/views/CandidatesTab.tsx', content);
console.log("Unflattened");
