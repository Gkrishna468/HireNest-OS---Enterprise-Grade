import { MailOSService } from './src/api-lib/services/MailOSService.js';
MailOSService.syncInbox("gHW8dOBiUBQELF2jff4mAgy267x2", "ORG-GLOBAL-HQ").then(() => console.log("Done")).catch(console.error);
