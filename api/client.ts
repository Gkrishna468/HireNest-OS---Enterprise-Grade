
import clientCandidateHandler from '../src/api-lib/handlers/client-candidate.ts';
import clientSubmissionsHandler from '../src/api-lib/handlers/client-submissions.ts';
export default async function handler(req: any, res: any) {
  const action = req.query.action || req.body?.action;
  if (action === 'submissions') return await clientSubmissionsHandler(req, res);
  return await clientCandidateHandler(req, res);
}
