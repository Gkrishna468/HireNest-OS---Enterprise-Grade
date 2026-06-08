import fs from 'fs';
import path from 'path';

const handlersDir = path.join(process.cwd(), 'src', 'api-lib', 'handlers');
const apiDir = path.join(process.cwd(), 'api');

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir);
}

// Move them back from handlers to api, we will do manual consolidation shortly.
const filesToRestore = [
  'admin.ts', 'analytics.ts', 'bulk-parse-resumes.ts', 'client-candidate.ts', 'client-submissions.ts',
  'extract-text.ts', 'intel.ts', 'interviews.ts', 'match-candidates-detailed.ts', 'parse-jd.ts',
  'repair-candidates.ts', 'user.ts', 'validate-submission.ts'
];

for (const file of filesToRestore) {
  const src = path.join(handlersDir, file);
  const dest = path.join(apiDir, file);
  if (fs.existsSync(src)) {
    let content = fs.readFileSync(src, 'utf8');
    // revert imports
    content = content.replace(/from "\.\//g, 'from "../src/api-lib/handlers/');
    content = content.replace(/from "\.\.\/\.\.\//g, 'from "../src/');
    fs.writeFileSync(dest, content, 'utf8');
    fs.unlinkSync(src);
  }
}
