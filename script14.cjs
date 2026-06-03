const fs = require('fs');
let c = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

c = c.replace(/jobs=\{jobs\}\\n\s*vendorMap=\{vendorMap\}\\n\s*globalSubmissions=\{globalSubmissions\}/, 'orgId={userOrgId || ""}');

c = c.replace(/<EmptyState\\s*\\n?\\s*title="No Candidates Found"\\s*\\n?\\s*description="Your bench is currently empty or no candidates match your search."/, '<EmptyState icon={Users} title="No Candidates Found" description="Your bench is currently empty or no candidates match your search."');

c = c.replace(/variant="primary"/g, 'variant="default"');

fs.writeFileSync('src/views/CandidatesTab.tsx', c);
console.log('Fixed UI Types');
