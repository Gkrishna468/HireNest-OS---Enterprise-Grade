const fs = require('fs');
const file = 'src/api-lib/handlers/analytics.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace standard gets with selected fields to respect "5. SELECT * - stop fetching columns you'll never use"
// and to mitigate "2. No pagination" out-of-memory errors on large collections.
content = content.replace(
  /const reqsSnap = await adminDb\.collection\("requirements_public"\)\.get\(\);/g,
  'const reqsSnap = await adminDb.collection("requirements_public").select("status", "financials").get();'
);

content = content.replace(
  /const candsSnap = await adminDb\.collection\("candidatePool"\)\.get\(\);/g,
  'const candsSnap = await adminDb.collection("candidatePool").select("assignedRecruiterId", "uploaderId", "vendorId", "status").get();'
);

content = content.replace(
  /const subsSnap = await adminDb\.collection\("submissions"\)\.get\(\);/g,
  'const subsSnap = await adminDb.collection("submissions").select("recruiterId", "vendorId", "status", "candidateId").get();'
);

fs.writeFileSync(file, content);
