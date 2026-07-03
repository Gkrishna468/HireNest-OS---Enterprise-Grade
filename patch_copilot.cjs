const fs = require('fs');
const file = 'src/views/AICopilotTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'fetch("/api/copilot"',
  'fetch("/api/ai"'
);

content = content.replace(
  'body: JSON.stringify({ query: activeQuery })',
  'body: JSON.stringify({ prompt: activeQuery, feature: "copilot", promptVersion: "v1.0" })'
);

content = content.replace(
  'const data = await res.json();',
  `const dataRaw = await res.json();
        let data = dataRaw;
        if (dataRaw.response) {
            try {
                data = JSON.parse(dataRaw.response);
            } catch(e) {
                data = { answer: dataRaw.response };
            }
        }`
);

fs.writeFileSync(file, content);
