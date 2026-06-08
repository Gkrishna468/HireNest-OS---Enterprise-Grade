import fs from 'fs';
import path from 'path';

const apiDir = path.join(process.cwd(), 'api');

const writeApi = (name: string, content: string) => {
  fs.writeFileSync(path.join(apiDir, name), content, 'utf8');
};

writeApi('admin.ts', `
import adminHandler from '../src/api-lib/handlers/admin.js';
export default async function handler(req: any, res: any) {
  return await adminHandler(req, res);
}
`);

writeApi('client.ts', `
import clientCandidateHandler from '../src/api-lib/handlers/client-candidate.js';
import clientSubmissionsHandler from '../src/api-lib/handlers/client-submissions.js';
export default async function handler(req: any, res: any) {
  const action = req.query.action || req.body?.action;
  if (action === 'submissions') return await clientSubmissionsHandler(req, res);
  return await clientCandidateHandler(req, res);
}
`);

writeApi('workflow.ts', `
import repairCandidatesHandler from '../src/api-lib/handlers/repair-candidates.js';
import validateSubmissionHandler from '../src/api-lib/handlers/validate-submission.js';
export default async function handler(req: any, res: any) {
  const action = req.query.action || req.body?.action;
  if (action === 'validate-submission') return await validateSubmissionHandler(req, res);
  return await repairCandidatesHandler(req, res);
}
`);

writeApi('ai.ts', `
import parseJdHandler from '../src/api-lib/handlers/parse-jd.js';
import extractTextHandler from '../src/api-lib/handlers/extract-text.js';
import matchDetailedHandler from '../src/api-lib/handlers/match-candidates-detailed.js';
import bulkParseHandler from '../src/api-lib/handlers/bulk-parse-resumes.js';
export default async function handler(req: any, res: any) {
  const action = req.query.action || req.body?.action;
  if (action === 'extract-text') return await extractTextHandler(req, res);
  if (action === 'match-detailed') return await matchDetailedHandler(req, res);
  if (action === 'bulk-parse') return await bulkParseHandler(req, res);
  return await parseJdHandler(req, res);
}
`);

writeApi('interviews.ts', `
import interviewsHandler from '../src/api-lib/handlers/interviews.js';
export default async function handler(req: any, res: any) {
  return await interviewsHandler(req, res);
}
`);

writeApi('intel.ts', `
import intelHandler from '../src/api-lib/handlers/intel.js';
export default async function handler(req: any, res: any) {
  return await intelHandler(req, res);
}
`);

writeApi('analytics.ts', `
import analyticsHandler from '../src/api-lib/handlers/analytics.js';
export default async function handler(req: any, res: any) {
  return await analyticsHandler(req, res);
}
`);

writeApi('user.ts', `
import userHandler from '../src/api-lib/handlers/user.js';
export default async function handler(req: any, res: any) {
  return await userHandler(req, res);
}
`);

console.log("Created consolidated Vercel API endpoints!");
