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
  if (body.error) console.log("Error:", body.error);
  server.close();
});
