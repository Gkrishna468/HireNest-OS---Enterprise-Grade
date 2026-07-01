const fs = require('fs');
const content = fs.readFileSync('src/views/AutonomousOperationsTab.tsx', 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('//')) continue;

  let pos = 0;
  while (pos < line.length) {
    const openIdx = line.indexOf('<div', pos);
    const closeIdx = line.indexOf('</div', pos);

    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
      // Is it self-closing?
      const endTag = line.indexOf('>', openIdx);
      if (endTag !== -1 && line[endTag - 1] === '/') {
        pos = endTag + 1;
      } else {
        stack.push({ line: i + 1, col: openIdx });
        pos = openIdx + 4;
      }
    } else if (closeIdx !== -1 && (openIdx === -1 || closeIdx < openIdx)) {
      stack.pop();
      pos = closeIdx + 6;
    } else {
      break;
    }
  }
}
console.log("Unmatched:", stack);
