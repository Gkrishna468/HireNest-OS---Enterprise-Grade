import { adminDb } from './src/lib/firebase-admin.ts';

async function audit() {
  console.log("--- Requirements ---");
  const reqs = await adminDb.collection("requirements_public").get();
  reqs.docs.forEach(d => {
    const data = d.data();
    if (data.title && data.title.includes("Software Engineer")) {
      console.log(`Requirement [${d.id}]:`, {
        title: data.title,
        id: data.id,
        reqId: data.reqId,
        jobId: data.jobId,
        clientId: data.clientId
      });
    }
  });

  console.log("\n--- Candidates with mappedJobId ---");
  const candidates = await adminDb.collection("candidatePool").where("title", "==", "Software Engineer (Full Stack)").get();
  // Wait, let's just get all candidates
  const allCand = await adminDb.collection("candidatePool").get();
  allCand.docs.forEach(d => {
    const data = d.data();
    if (data.mappedJobId || data.name?.includes("Engineer") || data.title?.includes("Engineer")) {
        console.log(`Candidate [${d.id}]: mappedJobId = ${data.mappedJobId}, reqId = ${data.reqId}, jobId = ${data.jobId}, name = ${data.name}`);
    }
  });

  console.log("\n--- AI Matches ---");
  const aiMatches = await adminDb.collectionGroup("ai_matches").get();
  aiMatches.docs.forEach(d => {
    const data = d.data();
    console.log(`AI Match [${d.id}] (cand: ${d.ref.parent.parent?.id}): requirementId = ${data.requirementId}, reqId = ${data.reqId}`);
  });

  console.log("\n--- Submissions ---");
  const submissions = await adminDb.collection("submissions").get();
  submissions.docs.forEach(d => {
    const data = d.data();
    console.log(`Submission [${d.id}]: requirementId = ${data.requirementId}, reqId = ${data.reqId}, jobId = ${data.jobId}`);
  });
}

audit().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });
