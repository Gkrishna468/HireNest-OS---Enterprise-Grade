const fs = require('fs');
const content = fs.readFileSync('src/views/AutonomousOperationsTab.tsx', 'utf8');

let depth = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '<') {
     // skip <=
     if (content[i+1] === '=') continue;
     // skip space after <
     if (content[i+1] === ' ') continue;
     depth++;
  }
  if (content[i] === '>') {
     // skip =>
     if (content[i-1] === '=') continue;
     // skip ->
     if (content[i-1] === '-') continue;
     depth--;
  }
}
console.log("Unmatched < >:", depth);
