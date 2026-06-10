const handlers = [
  'admin', 'client-candidate', 'client-submissions', 'repair-candidates',
  'validate-submission', 'parse-jd', 'extract-text', 'match-candidates-detailed',
  'bulk-parse-resumes', 'interviews', 'intel', 'analytics', 'user', 'workflows',
  'oauth', 'google-proxy'
];

async function check() {
  for (const h of handlers) {
    try {
      await import('./src/api-lib/handlers/' + h + '.ts');
      console.log('✅ ' + h);
    } catch (e: any) {
      console.error('❌ ' + h, e.message);
    }
  }
}
check();
