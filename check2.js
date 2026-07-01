const fs = require('fs');
const content = fs.readFileSync('src/views/AutonomousOperationsTab.tsx', 'utf8');

const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;

console.log('Open divs:', openDivs);
console.log('Close divs:', closeDivs);

const lines = content.split('\n');
let depth = 0;
for(let i=0; i<lines.length; i++) {
  const line = lines[i];
  const o = (line.match(/<div/g) || []).length;
  const c = (line.match(/<\/div>/g) || []).length;
  depth += o - c;
  if(depth < 0) {
    console.log(`Negative depth at line ${i+1}`);
    break;
  }
}
console.log('Final depth:', depth);
