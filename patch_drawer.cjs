const fs = require('fs');
const file = 'src/components/UniversalAIChatDrawer.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const data = await res.json();',
  `const dataRaw = await res.json();
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
