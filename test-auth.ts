import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://localhost:3000/api/cleanup-matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer foo' },
    body: JSON.stringify({ role: 'adminHQ' })
  });
  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("BODY:", text.substring(0, 200));
}
run();
