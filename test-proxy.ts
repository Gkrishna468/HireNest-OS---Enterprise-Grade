import { db } from './src/lib/firebase-admin.js';

async function test() {
  const customApiKey = 'HN_dev_key_123';
  const res = await fetch('http://localhost:3000/api/google/gmail/messages', {
    headers: { Authorization: `Bearer ${customApiKey}` }
  });
  const text = await res.text();
  console.log("Response:", text);
}

test().catch(console.error);
