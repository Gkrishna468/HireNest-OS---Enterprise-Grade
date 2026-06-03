const fs = require('fs');

let c = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

c = c.replace(
  /<h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">\\n\\s*\{candidate.fullName \|\| candidate.name \|\| "Unknown"\}\\n\\s*\{candidate.email && \\(\\n\\s*<CheckCircle.*\\n\\s*\\)\}\\n\\s*<\/h3>/m,
  \`<h3 className="font-semibold text-lg text-slate-900 flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                       {candidate.fullName || candidate.name || "Unknown"}
                       {candidate.email && <CheckCircle className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-normal">
                       {candidate.candidateId || candidate.id || "HN-CAN-PENDING"}
                    </span>
                  </h3>\`
);

// We need to use global replace for all grid cards! The above was just fixing the first match which is fine but wait, `.replace` with a string or regex without `/g` only does the first.
// Let's use a regex with /g
const regexName = /<h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">\\s*\{candidate\.fullName \|\| candidate\.name \|\| "Unknown"\}\\s*\{candidate\.email && \(\\s*<CheckCircle className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" \/>\\s*\)\}\\s*<\/h3>/g;

c = c.replace(regexName, \`<h3 className="font-semibold text-lg text-slate-900 flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                       {candidate.fullName || candidate.name || "Unknown"}
                       {candidate.email && <CheckCircle className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-normal">
                       {candidate.candidateId || candidate.id || "HN-CAN-PENDING"}
                    </span>
                  </h3>\`);

// Also update the Drawer view Header 
const regexDrawer = /<h2 className="text-2xl font-bold tracking-tight text-slate-900">\{selectedCandidate\.fullName \|\| selectedCandidate\.name \|\| "Unknown"\}<\/h2>/g;

c = c.replace(regexDrawer, \`<h2 className="text-2xl font-bold tracking-tight text-slate-900">{selectedCandidate.fullName || selectedCandidate.name || "Unknown"}</h2>
                        <div className="text-sm font-mono text-slate-400 mt-0.5">{selectedCandidate.candidateId || selectedCandidate.id || "HN-CAN-PENDING"}</div>\`);

fs.writeFileSync('src/views/CandidatesTab.tsx', c);
console.log('Update Candidate IDs');
