import { db } from './src/lib/firebase.ts';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';

async function audit() {
  console.log("--- Requirements ---");
  const reqs = await getDocs(collection(db, "requirements_public"));
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
  const allCand = await getDocs(collection(db, "candidatePool"));
  allCand.docs.forEach(d => {
    const data = d.data();
    if (data.mappedJobId || data.name?.includes("Engineer") || data.title?.includes("Engineer") || data.mappedJobId === "WKQHRNEJE" || data.name?.includes("Alex")) {
        console.log(`Candidate [${d.id}]: mappedJobId = ${data.mappedJobId}, requirementId = ${data.requirementId}, name = ${data.name || data.fullName}, reqId = ${data.reqId}, jobId = ${data.jobId}`);
    }
  });

  console.log("\n--- AI Matches ---");
  const aiMatches = await getDocs(collectionGroup(db, "ai_matches"));
  aiMatches.docs.forEach(d => {
    const data = d.data();
    console.log(`AI Match [${d.id}] (cand: ${d.ref.parent.parent?.id}): requirementId = ${data.requirementId}, reqId = ${data.reqId}`);
  });

  console.log("\n--- Submissions ---");
  const submissions = await getDocs(collection(db, "submissions"));
  submissions.docs.forEach(d => {
    const data = d.data();
    console.log(`Submission [${d.id}]: requirementId = ${data.requirementId}, reqId = ${data.reqId}, jobId = ${data.jobId}, candId = ${data.candidateId}`);
  });
}

audit().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });
