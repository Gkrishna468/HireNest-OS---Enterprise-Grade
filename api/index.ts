export default async function handler(req: any, res: any) {
  try {
    const { path } = req.query;
    const action = req.query.action || req.body?.action;

    // Use dynamic import so that if a module is broken, it doesn't crash the entire function on boot.
    const runHandler = async (modulePath: string) => {
      try {
         const module = await import(modulePath);
         return await module.default(req, res);
      } catch (err: any) {
         console.error("DYNAMIC_IMPORT_ERROR:", err);
         return res.status(500).json({ success: false, error: "Handler load failed: " + String(err.message || err.toString()), stack: err.stack });
      }
    };

    if (path === 'admin')            return await runHandler('../src/api-lib/handlers/admin');
    if (path === 'client-candidate') return await runHandler('../src/api-lib/handlers/client-candidate');
    if (path === 'client-submissions') return await runHandler('../src/api-lib/handlers/client-submissions');
    if (path === 'repair-candidates') return await runHandler('../src/api-lib/handlers/repair-candidates');
    if (path === 'validate-submission') return await runHandler('../src/api-lib/handlers/validate-submission');
    if (path === 'parse-jd')          return await runHandler('../src/api-lib/handlers/parse-jd');
    if (path === 'extract-text')      return await runHandler('../src/api-lib/handlers/extract-text');
    if (path === 'match-detailed')    return await runHandler('../src/api-lib/handlers/match-candidates-detailed');
    if (path === 'bulk-parse')        return await runHandler('../src/api-lib/handlers/bulk-parse-resumes');
    if (path === 'interviews')        return await runHandler('../src/api-lib/handlers/interviews');
    if (path === 'intel')             return await runHandler('../src/api-lib/handlers/intel');
    if (path === 'analytics')         return await runHandler('../src/api-lib/handlers/analytics');
    if (path === 'user')              return await runHandler('../src/api-lib/handlers/user');
    if (path === 'workflows')         return await runHandler('../src/api-lib/handlers/workflows');
    if (path === 'oauth')             return await runHandler('../src/api-lib/handlers/oauth');
    if (path === 'google')            return await runHandler('../src/api-lib/handlers/google-proxy');

    switch (action) {
      case 'candidate': return await runHandler('../src/api-lib/handlers/client-candidate');
      case 'submissions': return await runHandler('../src/api-lib/handlers/client-submissions');
      case 'repair': return await runHandler('../src/api-lib/handlers/repair-candidates');
      case 'validate-submission': return await runHandler('../src/api-lib/handlers/validate-submission');
      case 'parse-jd': return await runHandler('../src/api-lib/handlers/parse-jd');
      case 'extract-text': return await runHandler('../src/api-lib/handlers/extract-text');
      case 'match-detailed': return await runHandler('../src/api-lib/handlers/match-candidates-detailed');
      case 'bulk-parse': return await runHandler('../src/api-lib/handlers/bulk-parse-resumes');
    }

    if (!path && !action) {
       return res.status(200).json({ success: true, message: "api/index root reached with no path or action" });
    }

    return await runHandler('../src/api-lib/handlers/admin');
  } catch (err: any) {
    console.error("VERCEL_API_ERROR_CAUGHT:", err);
    return res.status(500).json({ success: false, error: String(err.message || err) });
  }
}

