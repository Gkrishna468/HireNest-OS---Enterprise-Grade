import fetch from 'node-fetch';

async function test() {
  const customApiKey = 'HN_dev_key_123';
  const res = await fetch('http://localhost:3000/api/workspace/intake/metrics', {
    headers: { Authorization: `Bearer ${customApiKey}` }
  });
  const data = await res.json();
  console.log("Metrics:", data);
}

test().catch(console.error);
