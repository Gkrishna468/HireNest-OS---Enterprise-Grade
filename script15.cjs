const fs = require('fs');
let c = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

c = c.replace(/jobs=\{jobs\}[\s\S]*?globalSubmissions=\{globalSubmissions\}[\s\S]*?userRole=\{userRole\}/, 'orgId={userOrgId || ""} userRole={userRole}');

c = c.replace(/title="No Candidates Found"/g, 'icon={Users} title="No Candidates Found"');

fs.writeFileSync('src/views/CandidatesTab.tsx', c);
console.log('Fixed UI Types again');
