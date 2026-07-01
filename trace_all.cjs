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
      const endTag = line.indexOf('>', openIdx);
      if (endTag !== -1 && line[endTag - 1] === '/') {
        pos = endTag + 1;
      } else {
        stack.push(i + 1);
        pos = openIdx + 4;
      }
    } else if (closeIdx !== -1 && (openIdx === -1 || closeIdx < openIdx)) {
      const popped = stack.pop();
      // console.log(`Line ${i + 1} closed tag from line ${popped}`);
      pos = closeIdx + 6;
    } else {
      break;
    }
  }
}
console.log("End stack length", stack.length);
console.log(stack);
