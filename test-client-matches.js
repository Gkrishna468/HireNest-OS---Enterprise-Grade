import fetch from 'node-fetch';
fetch('http://localhost:3000/api/client-matches?orgId=ORG-da6tlboe1', { headers: { Authorization: "Bearer dev-override" } }).then(r => r.text()).then(r => console.log(r)).catch(console.error);
