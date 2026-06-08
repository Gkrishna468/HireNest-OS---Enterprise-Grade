
import repairCandidatesHandler from '../src/api-lib/handlers/repair-candidates.ts';
import validateSubmissionHandler from '../src/api-lib/handlers/validate-submission.ts';
export default async function handler(req: any, res: any) {
  const action = req.query.action || req.body?.action;
  if (action === 'validate-submission') return await validateSubmissionHandler(req, res);
  return await repairCandidatesHandler(req, res);
}
