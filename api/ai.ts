
import parseJdHandler from '../src/api-lib/handlers/parse-jd.ts';
import extractTextHandler from '../src/api-lib/handlers/extract-text.ts';
import matchDetailedHandler from '../src/api-lib/handlers/match-candidates-detailed.ts';
import bulkParseHandler from '../src/api-lib/handlers/bulk-parse-resumes.ts';
export default async function handler(req: any, res: any) {
  const action = req.query.action || req.body?.action;
  if (action === 'extract-text') return await extractTextHandler(req, res);
  if (action === 'match-detailed') return await matchDetailedHandler(req, res);
  if (action === 'bulk-parse') return await bulkParseHandler(req, res);
  return await parseJdHandler(req, res);
}
