import fs from 'fs';
import path from 'path';

const vercelFile = path.join(process.cwd(), 'vercel.json');
let vercelJson = JSON.parse(fs.readFileSync(vercelFile, 'utf8'));

if (!vercelJson.rewrites) vercelJson.rewrites = [];

// remove the generic api route match if it exists.
vercelJson.rewrites = vercelJson.rewrites.filter((rw: any) => !rw.source.includes(':path*'));

// add our new unified routes
vercelJson.rewrites.push({ source: "/api/client-candidate", destination: "/api/client?action=candidate" });
vercelJson.rewrites.push({ source: "/api/client-submissions", destination: "/api/client?action=submissions" });

vercelJson.rewrites.push({ source: "/api/parse-jd", destination: "/api/ai?action=parse-jd" });
vercelJson.rewrites.push({ source: "/api/extract-text", destination: "/api/ai?action=extract-text" });
vercelJson.rewrites.push({ source: "/api/match-candidates-detailed", destination: "/api/ai?action=match-detailed" });
vercelJson.rewrites.push({ source: "/api/bulk-parse-resumes", destination: "/api/ai?action=bulk-parse" });

vercelJson.rewrites.push({ source: "/api/validate-submission", destination: "/api/workflow?action=validate-submission" });
vercelJson.rewrites.push({ source: "/api/repair-candidates", destination: "/api/workflow?action=repair" });

vercelJson.rewrites.push({ source: "/api/:path*", destination: "/api/:path*" });
vercelJson.rewrites.push({ source: "/:path*", destination: "/index.html" });

fs.writeFileSync(vercelFile, JSON.stringify(vercelJson, null, 2), 'utf8');
console.log('Updated vercel.json rewrites.');
