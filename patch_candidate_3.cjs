const fs = require('fs');
const file = 'src/views/workspaces/CandidatePortalWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `body: JSON.stringify({
          query: userMsgText,
          context: "candidate_career_coach",
          pageData: JSON.stringify({
            candidateName: profile.name,
            skills: profile.skills,
            targetRoles: profile.targetRoles,
            experienceYears: profile.experienceYears,
          })
        })`;

const replacement = `body: JSON.stringify({ prompt: \`Candidate: \${profile.name}, Skills: \${profile.skills.join(', ')}. Target: \${profile.targetRoles.join(', ')}. Query: \${userMsgText}\`, feature: "candidate_coach", promptVersion: "v1.0" })`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
