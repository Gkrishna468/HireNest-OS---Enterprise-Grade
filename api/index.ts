console.log("API INDEX LOADED");

import adminHandler from '../src/api-lib/handlers/admin';
import clientCandidateHandler from '../src/api-lib/handlers/client-candidate';
import clientSubmissionsHandler from '../src/api-lib/handlers/client-submissions';
import repairCandidatesHandler from '../src/api-lib/handlers/repair-candidates';
import validateSubmissionHandler from '../src/api-lib/handlers/validate-submission';
import parseJdHandler from '../src/api-lib/handlers/parse-jd';
import extractTextHandler from '../src/api-lib/handlers/extract-text';
import matchDetailedHandler from '../src/api-lib/handlers/match-candidates-detailed';
import bulkParseHandler from '../src/api-lib/handlers/bulk-parse-resumes';
import interviewsHandler from '../src/api-lib/handlers/interviews';
import intelHandler from '../src/api-lib/handlers/intel';
import analyticsHandler from '../src/api-lib/handlers/analytics';
import userHandler from '../src/api-lib/handlers/user';
import workflowsHandler from '../src/api-lib/handlers/workflows';
import oauthHandler from '../src/api-lib/handlers/oauth';
import googleProxyHandler from '../src/api-lib/handlers/google-proxy';

export default async function handler(req: any, res: any) {
  try {
    const { path } = req.query;
    console.log("PATH =", path);
    
    return res.status(200).json({
      success: true,
      message: "api/index alive"
    });

    // Also support action param just in case

    const action = req.query.action || req.body?.action;

    // We map paths based on the requested endpoint
    // Using `/api/index?path=...` logic via vercel.json rewrite 
    
    if (path === 'admin')            return await adminHandler(req, res);
    if (path === 'client-candidate') return await clientCandidateHandler(req, res);
    if (path === 'client-submissions') return await clientSubmissionsHandler(req, res);
    if (path === 'repair-candidates') return await repairCandidatesHandler(req, res);
    if (path === 'validate-submission') return await validateSubmissionHandler(req, res);
    if (path === 'parse-jd')          return await parseJdHandler(req, res);
    if (path === 'extract-text')      return await extractTextHandler(req, res);
    if (path === 'match-detailed')    return await matchDetailedHandler(req, res);
    if (path === 'bulk-parse')        return await bulkParseHandler(req, res);
    if (path === 'interviews')        return await interviewsHandler(req, res);
    if (path === 'intel')             return await intelHandler(req, res);
    if (path === 'analytics')         return await analyticsHandler(req, res);
    if (path === 'user')              return await userHandler(req, res);
    if (path === 'workflows')         return await workflowsHandler(req, res);
    if (path === 'oauth')             return await oauthHandler(req, res, () => {});
    if (path === 'google')            return await googleProxyHandler(req, res, () => {});

    // Provide fallback based on `action` parameter if `path` is not exactly one of the above.
    switch (action) {
      case 'candidate': return await clientCandidateHandler(req, res);
      case 'submissions': return await clientSubmissionsHandler(req, res);
      case 'repair': return await repairCandidatesHandler(req, res);
      case 'validate-submission': return await validateSubmissionHandler(req, res);
      case 'parse-jd': return await parseJdHandler(req, res);
      case 'extract-text': return await extractTextHandler(req, res);
      case 'match-detailed': return await matchDetailedHandler(req, res);
      case 'bulk-parse': return await bulkParseHandler(req, res);
    }

    // Fallback to admin handler for typical admin actions, handling the rest
    return await adminHandler(req, res);
  } catch (err: any) {
    console.error("VERCEL_API_ERROR_CAUGHT:", err);
    return res.status(500).json({ success: false, error: String(err.message || err) });
  }
}

