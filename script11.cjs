const fs = require('fs');
let code = fs.readFileSync('src/lib/workflows/SubmissionOrchestrator.ts', 'utf8');

code = code.replace(/req\.submitterId/g, 'request.submitterId');

fs.writeFileSync('src/lib/workflows/SubmissionOrchestrator.ts', code);
console.log("Fixed req.submitterId usage");
