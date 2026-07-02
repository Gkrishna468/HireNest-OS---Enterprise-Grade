const fs = require('fs');
const content = fs.readFileSync('src/api-lib/handlers/workspace.ts', 'utf8');

const targetStr = `  } catch (e: any) {
    console.error("MailOS Analyze Error:", e);
    res.status(500).json({ error: e.message });
  }
});`;

const newContent = content.replace(targetStr, '');
fs.writeFileSync('src/api-lib/handlers/workspace.ts', newContent);
console.log('Fixed workspace.ts');
