const fs = require('fs');
const file = 'src/views/workspaces/CandidatePortalWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'fetch("/api/copilot", {',
  `fetch("/api/ai", {`
);

content = content.replace(
  `headers: { "Content-Type": "application/json" },`,
  `headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await (await import("../../lib/firebase")).auth.currentUser?.getIdToken() || "") },`
);

content = content.replace(
  /body: JSON\.stringify\(\{\s*query: userMsgText,\s*context: "candidate_career_coach",\s*pageData: JSON\.stringify\(\{\s*candidateName: profile\.name,\s*skills: profile\.skills,\s*targetRoles: profile\.targetRoles,\s*experienceYears: profile\.experienceYears,\s*\}\)\s*\}\)/s,
  `body: JSON.stringify({ prompt: \`Candidate: \${profile.name}, Skills: \${profile.skills}. Query: \${userMsgText}\`, feature: "candidate_coach", promptVersion: "v1.0" })`
);

content = content.replace(
  'const data = await response.json();',
  `const dataRaw = await response.json();
      let data = dataRaw;
      if (dataRaw.response) {
          try {
              data = JSON.parse(dataRaw.response);
          } catch(e) {
              data = { insight: dataRaw.response };
          }
      }`
);

fs.writeFileSync(file, content);
