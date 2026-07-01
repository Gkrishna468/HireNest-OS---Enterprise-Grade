const fs = require('fs');
const content = fs.readFileSync('src/views/AutonomousOperationsTab.tsx', 'utf8');
let stack = [];
let htmlStack = [];
for (let i = 0; i < content.length; i++) {
  if (content[i] === '(') stack.push({ char: '(', line: getLine(i) });
  if (content[i] === ')') {
     let last = stack.pop();
     if (last.char !== '(') console.log("Mismatch ) at line", getLine(i));
  }
  if (content[i] === '{') stack.push({ char: '{', line: getLine(i) });
  if (content[i] === '}') {
     let last = stack.pop();
     if (last.char !== '{') console.log("Mismatch } at line", getLine(i));
  }
}
function getLine(pos) {
  return content.slice(0, pos).split('\n').length;
}
console.log(stack);
