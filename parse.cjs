const ts = require('typescript');
const fs = require('fs');

const content = fs.readFileSync('src/views/AutonomousOperationsTab.tsx', 'utf8');
const sourceFile = ts.createSourceFile('file.tsx', content, ts.ScriptTarget.Latest, true);

function printErrors(node) {
  const diagnostics = sourceFile.parseDiagnostics;
  if (diagnostics.length > 0) {
    diagnostics.forEach(diag => {
      const pos = sourceFile.getLineAndCharacterOfPosition(diag.start);
      console.log(`Line ${pos.line + 1}, Col ${pos.character + 1}: ${diag.messageText}`);
    });
  } else {
    console.log("No syntax errors found by JS parser.");
  }
}
printErrors();
