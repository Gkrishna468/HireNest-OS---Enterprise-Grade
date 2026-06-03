const fs = require('fs');
let lines = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8').split('\n');

for(let i=0; i<lines.length; i++) {
   if(lines[i] === '"') {
      if(lines[i-1] === '') {
         // It's the `=== Merged Context ===` block
      }
   }
}

// Easier: just find `(origData.resumeText || "") +` and reconstruct the broken lines manually.
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('            (origData.resumeText || "") +')) {
        lines[i+1] = '            "\\n\\n=== Merged Context ===\\n" +';
        lines[i+2] = '            dupCand.resumeText;';
        lines[i+3] = '';
        lines[i+4] = '';
        lines[i+5] = '';
    }
}
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('              ((dMatch.candidate.resumeText || "") + "')) {
        lines[i] = '              ((dMatch.candidate.resumeText || "") + "\\n\\n=== Merged Context ===\\n" + formData.resumeText) : ';
        lines[i+1] = '';
        lines[i+2] = '';
        lines[i+3] = '';
        lines[i+4] = '';
    }
}

// Clean up empty lines created
lines = lines.filter((l, index) => {
   // We deleted some lines by making them empty, but we must protect actual needed empty lines. 
   // Instead of filtering, we can just let empty lines exist, but those specific lines were part of Javascript statement so we can just leave them as empty lines. The compiler doesn't care.
   return true;
});

fs.writeFileSync('src/views/CandidatesTab.tsx', lines.join('\n'));
console.log("Fixed manually");
