import fetch from 'node-fetch';

async function test() {
  const customApiKey = 'HN_dev_key_123';
  const res = await fetch('http://localhost:3000/api/google/gmail/messages', {
    headers: { Authorization: `Bearer ${customApiKey}` }
  });
  const data = await res.json();
  console.log("Messages returned:", data.messages?.length);
  if (data.error) console.log("Error:", data.error);
}

test().catch(console.error);
