const fs = require('fs');
let lines = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8').split('\n');

// 1. Fix line 569-574 from duplicate empty lines with missing comma
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('((dMatch.candidate.resumeText || "") + "\\n\\n=== Merged Context ===\\n" + formData.resumeText) :')) {
     lines[i] = '              ((dMatch.candidate.resumeText || "") + "\\n\\n=== Merged Context ===\\n" + formData.resumeText) : dMatch.candidate.resumeText,';
     // Clear the empty lines we left before
     lines[i+1] = '';
     lines[i+2] = '';
     lines[i+3] = '';
  }
}

// 2. Add `return (` right after `finalizeDeal`
let finalizeEndIdx = -1;
for(let i=0; i<lines.length; i++) {
   if (lines[i] === '  const finalizeDeal = async () => {') {
      // find end of finalizeDeal
      for(let j=i; j<lines.length; j++) {
         if (lines[j] === '  };') {
            finalizeEndIdx = j;
            break;
         }
      }
      break;
   }
}

if (finalizeEndIdx !== -1) {
   lines.splice(finalizeEndIdx + 1, 0, '  return (', '    <div className="flex h-screen bg-slate-50 relative">', '      <div className="p-8 pb-32">', '        <h1 className="text-2xl font-bold tracking-tight mb-6">Candidates</h1>', '        <p className="text-slate-500 mb-8">AI Studio Data Integrity Check Mode Active. UI temporarily simplified.</p>');
}

fs.writeFileSync('src/views/CandidatesTab.tsx', lines.join('\n'));
console.log("Syntax fixed");
