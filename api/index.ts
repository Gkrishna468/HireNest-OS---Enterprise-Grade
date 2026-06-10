export default async function handler(req: any, res: any) {
  try {
    const { path } = req.query;
    const action = req.query.action || req.body?.action;

    let targetHandler: any;

    if (path === 'admin')            targetHandler = (await import('../src/api-lib/handlers/admin')).default;
    else if (path === 'client-candidate') targetHandler = (await import('../src/api-lib/handlers/client-candidate')).default;
    else if (path === 'client-submissions') targetHandler = (await import('../src/api-lib/handlers/client-submissions')).default;
    else if (path === 'repair-candidates') targetHandler = (await import('../src/api-lib/handlers/repair-candidates')).default;
    else if (path === 'validate-submission') targetHandler = (await import('../src/api-lib/handlers/validate-submission')).default;
    else if (path === 'parse-jd')          targetHandler = (await import('../src/api-lib/handlers/parse-jd')).default;
    else if (path === 'extract-text')      targetHandler = (await import('../src/api-lib/handlers/extract-text')).default;
    else if (path === 'match-detailed')    targetHandler = (await import('../src/api-lib/handlers/match-candidates-detailed')).default;
    else if (path === 'bulk-parse')        targetHandler = (await import('../src/api-lib/handlers/bulk-parse-resumes')).default;
    else if (path === 'interviews')        targetHandler = (await import('../src/api-lib/handlers/interviews')).default;
    else if (path === 'intel')             targetHandler = (await import('../src/api-lib/handlers/intel')).default;
    else if (path === 'analytics')         targetHandler = (await import('../src/api-lib/handlers/analytics')).default;
    else if (path === 'user')              targetHandler = (await import('../src/api-lib/handlers/user')).default;
    else if (path === 'workflows')         targetHandler = (await import('../src/api-lib/handlers/workflows')).default;
    else if (path === 'oauth')             targetHandler = (await import('../src/api-lib/handlers/oauth')).default;
    else if (path === 'google')            targetHandler = (await import('../src/api-lib/handlers/google-proxy')).default;
    else {
      // Provide fallback based on `action` parameter if `path` is not exactly one of the above.
      switch (action) {
        case 'candidate': targetHandler = (await import('../src/api-lib/handlers/client-candidate')).default; break;
        case 'submissions': targetHandler = (await import('../src/api-lib/handlers/client-submissions')).default; break;
        case 'repair': targetHandler = (await import('../src/api-lib/handlers/repair-candidates')).default; break;
        case 'validate-submission': targetHandler = (await import('../src/api-lib/handlers/validate-submission')).default; break;
        case 'parse-jd': targetHandler = (await import('../src/api-lib/handlers/parse-jd')).default; break;
        case 'extract-text': targetHandler = (await import('../src/api-lib/handlers/extract-text')).default; break;
        case 'match-detailed': targetHandler = (await import('../src/api-lib/handlers/match-candidates-detailed')).default; break;
        case 'bulk-parse': targetHandler = (await import('../src/api-lib/handlers/bulk-parse-resumes')).default; break;
        default: targetHandler = (await import('../src/api-lib/handlers/admin')).default; break;
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

