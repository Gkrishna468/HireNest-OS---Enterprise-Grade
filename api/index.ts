export default async function handler(req: any, res: any) {
  try {
    const { path } = req.query;
    const action = req.query.action || req.body?.action;

    let targetHandler: any;

    if (path === 'admin')            targetHandler = (await import('../src/api-lib/handlers/admin.js')).default;
    else if (path === 'client-candidate') targetHandler = (await import('../src/api-lib/handlers/client-candidate.js')).default;
    else if (path === 'client-submissions') targetHandler = (await import('../src/api-lib/handlers/client-submissions.js')).default;
    else if (path === 'repair-candidates') targetHandler = (await import('../src/api-lib/handlers/repair-candidates.js')).default;
    else if (path === 'validate-submission') targetHandler = (await import('../src/api-lib/handlers/validate-submission.js')).default;
    else if (path === 'parse-jd')          targetHandler = (await import('../src/api-lib/handlers/parse-jd.js')).default;
    else if (path === 'extract-text')      targetHandler = (await import('../src/api-lib/handlers/extract-text.js')).default;
    else if (path === 'match-detailed')    targetHandler = (await import('../src/api-lib/handlers/match-candidates-detailed.js')).default;
    else if (path === 'bulk-parse')        targetHandler = (await import('../src/api-lib/handlers/bulk-parse-resumes.js')).default;
    else if (path === 'interviews')        targetHandler = (await import('../src/api-lib/handlers/interviews.js')).default;
    else if (path === 'intel')             targetHandler = (await import('../src/api-lib/handlers/intel.js')).default;
    else if (path === 'analytics')         targetHandler = (await import('../src/api-lib/handlers/analytics.js')).default;
    else if (path === 'user')              targetHandler = (await import('../src/api-lib/handlers/user.js')).default;
    else if (path === 'workflows')         targetHandler = (await import('../src/api-lib/handlers/workflows.js')).default;
    else if (path === 'oauth')             targetHandler = (await import('../src/api-lib/handlers/oauth.js')).default;
    else if (path === 'google')            targetHandler = (await import('../src/api-lib/handlers/google-proxy.js')).default;
    else {
      // Provide fallback based on `action` parameter if `path` is not exactly one of the above.
      switch (action) {
        case 'candidate': targetHandler = (await import('../src/api-lib/handlers/client-candidate.js')).default; break;
        case 'submissions': targetHandler = (await import('../src/api-lib/handlers/client-submissions.js')).default; break;
        case 'repair': targetHandler = (await import('../src/api-lib/handlers/repair-candidates.js')).default; break;
        case 'validate-submission': targetHandler = (await import('../src/api-lib/handlers/validate-submission.js')).default; break;
        case 'parse-jd': targetHandler = (await import('../src/api-lib/handlers/parse-jd.js')).default; break;
        case 'extract-text': targetHandler = (await import('../src/api-lib/handlers/extract-text.js')).default; break;
        case 'match-detailed': targetHandler = (await import('../src/api-lib/handlers/match-candidates-detailed.js')).default; break;
        case 'bulk-parse': targetHandler = (await import('../src/api-lib/handlers/bulk-parse-resumes.js')).default; break;
        default: targetHandler = (await import('../src/api-lib/handlers/admin.js')).default; break;
      }
    }

    if (targetHandler) {
      return await targetHandler(req, res);
    }

    return res.status(200).json({ success: true, message: "api/index alive but no handler matched" });
  } catch (err: any) {
    console.error("VERCEL_API_ERROR_CAUGHT:", err);
    return res.status(500).json({ success: false, error: String(err.message || err.toString()), stack: err.stack });
  }
}

