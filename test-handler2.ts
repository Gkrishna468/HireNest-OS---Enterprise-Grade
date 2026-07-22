import express from 'express';
import googleProxyHandler from './src/api-lib/handlers/google-proxy.js';
import fetch from 'node-fetch';

const app = express();
app.use((req, res, next) => {
  req.user = { uid: 'gHW8dOBiUBQELF2jff4mAgy267x2', role: 'admin', orgId: 'ORG-GLOBAL-HQ' };
  next();
});
app.use(googleProxyHandler);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/gmail/messages`);
  const body = await res.json();
  console.log("Body messages length:", body.messages?.length);
  if (body.messages && body.messages.length > 0) {
     console.log("First msg:", JSON.stringify(body.messages[0], null, 2));
  }
  server.close();
});
