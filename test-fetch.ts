import fetch from 'node-fetch';
const r = await fetch('http://localhost:3000/api/client-matches');
console.log(r.status);
console.log(await r.text());
