const fs = require('fs');
const content = fs.readFileSync('src/views/AutonomousOperationsTab.tsx', 'utf8');

const lines = content.split('\n');
const stack = [];

for(let i=0; i<lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('/*') || line.includes('//')) {
      // not a perfect parser but let's see
  }
  
  // Find all <div and </div> in the line
  let pos = 0;
  while (pos < line.length) {
    const nextOpen = line.indexOf('<div', pos);
    const nextClose = line.indexOf('</div', pos);
    
    if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose)) {
      // check if it's self closing
      const closeBracket = line.indexOf('>', nextOpen);
      if (closeBracket !== -1 && line[closeBracket-1] === '/') {
        // self closing
        pos = closeBracket + 1;
      } else {
        stack.push(i + 1); // line numbers are 1-based
        pos = nextOpen + 4;
      }
    } else if (nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen)) {
      stack.pop();
      pos = nextClose + 6;
    } else {
      break;
    }
  }
}

console.log('Unclosed divs at lines:', stack);
