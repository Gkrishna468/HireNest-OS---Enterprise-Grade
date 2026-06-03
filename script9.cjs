const fs = require('fs');
let lines = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8').split('\n');

for(let i=0; i<lines.length; i++) {
  if(lines[i] === '    </div>' && lines[i+1] === '  );' && lines[i+2] === '}') {
     lines.splice(i, 0, '      </div>');
     break;
  }
}

fs.writeFileSync('src/views/CandidatesTab.tsx', lines.join('\n'));
console.log("Closed divs");
