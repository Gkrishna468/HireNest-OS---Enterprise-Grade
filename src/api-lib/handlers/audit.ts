import { adminDb } from "../../lib/firebase-admin.ts";

export default async function handler(req: any, res: any) {
  try {
      const { role } = req.query;
      if (role !== 'admin' && role !== 'super_admin' && role !== 'ops_admin') {
         return res.status(403).send("Forbidden. Requires admin privileges to view cross-tenant audit data.");
      }
      const result: string[] = [];
      const push = (s: string) => result.push(s);

      push("--- Requirements ---");
      const reqs = await adminDb.collection("requirements_public").get();
      reqs.docs.forEach(d => {
        const data = d.data();
        if (data.title && data.title.includes("Software Engineer")) {
          push(`Requirement [${d.id}]: title=${data.title}, reqId=${data.reqId}, jobId=${data.jobId}`);
        }
      });

      push("");
      push("--- Candidates ---");
      const allCand = await adminDb.collection("candidatePool").get();
      allCand.docs.forEach(d => {
        const data = d.data();
        if (data.mappedJobId || data.title?.includes("Engineer") || data.reqId) {
            push(`Candidate [${d.id}]: mappedJobId = ${data.mappedJobId}, reqId=${data.reqId}, jobId=${data.jobId}, name=${data.name || data.fullName}`);
        }
      });

      push("");
      push("--- AI Matches ---");
      const aiMatches = await adminDb.collectionGroup("ai_matches").get();
      aiMatches.docs.forEach(d => {
        const data = d.data();
        push(`AI Match [${d.id}] (cand: ${d.ref.parent.parent?.id}): requirementId = ${data.requirementId}, reqId = ${data.reqId}`);
      });

      push("");
      push("--- Submissions ---");
      const submissions = await adminDb.collection("submissions").get();
      submissions.docs.forEach(d => {
        const data = d.data();
        push(`Submission [${d.id}]: requirementId = ${data.requirementId}, reqId = ${data.reqId}, jobId = ${data.jobId}, candId = ${data.candidateId}`);
      });

      res.setHeader('Content-Type', 'text/plain');
      res.send(result.join("\n"));
  } catch(e: any) {
      res.status(500).send(e.toString());
  }
}
