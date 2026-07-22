import { adminDb } from './src/lib/firebase-admin.js';
import { runMatchIntelligenceEngine } from './src/api-lib/handlers/rescan-matches.js';

runMatchIntelligenceEngine(undefined, "ORG-GLOBAL-HQ").then(c => console.log("Done", c)).catch(console.error);
