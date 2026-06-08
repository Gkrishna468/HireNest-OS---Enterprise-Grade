import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission: { id: "sub1", dealRoomId: null, candidateId: "c1", vendorId: "v1", candidateName: "Test" },
      requirement: { id: "req1", clientId: "cli1" },
      isClientAction: true,
      formData: { round: "Tech", date: "2026-01-01", time: "10:00AM", timezone: "UTC", mode: "Video", interviewer: "Bob" }
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
