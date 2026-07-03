const fs = require('fs');
const file = 'src/views/workspaces/CandidatePortalWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /body: JSON\.stringify\(\{\s*query: userMsgText,\s*context: "candidate_career_coach",\s*pageData: JSON\.stringify\(\{\s*candidateName: profile\.name,\s*skills: profile\.skills,\s*targetRoles: profile\.targetRoles,\s*experienceYears: profile\.experienceYears,\s*\}\)\s*\}\)/,
  `body: JSON.stringify({ prompt: \`Candidate: \${profile.name}, Skills: \${profile.skills.join(', ')}. Target: \${profile.targetRoles.join(', ')}. Query: \${userMsgText}\`, feature: "candidate_coach", promptVersion: "v1.0" })`
);

fs.writeFileSync(file, content);
