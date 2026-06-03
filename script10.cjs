const fs = require('fs');
let code = fs.readFileSync('src/lib/workflows/SubmissionOrchestrator.ts', 'utf8');

code = code.replace(/await emitEvent\(\{[\s\S]*?metadata: \{ candidateId, requirementId, submissionId, vendorId \}\n      \}\);/, 
`await emitEvent(
          "SubmissionCreated",
          "SUBMISSION",
          submissionId,
          req.submitterId || "SYSTEM",
          "vendor", 
          { candidateId, requirementId, vendorId, matchScore }
      );`);

fs.writeFileSync('src/lib/workflows/SubmissionOrchestrator.ts', code);
console.log("Fixed emitEvent usage");
