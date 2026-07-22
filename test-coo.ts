import { AICOORuntime } from './src/api-lib/os/kernel/AICOORuntime.js';

AICOORuntime.processInbox().then(() => console.log("Done")).catch(console.error);
