const fs = require('fs');
let code = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

const replaceFinalizeDeal = () => {
    const matchStart = code.indexOf('    try {\n      const dealPayload = {\n        id: roomId,');
    const matchEndFragment = '        createdAt: serverTimestamp(),\n      });\n';
    const matchEnd = code.indexOf(matchEndFragment, matchStart + 1000) + matchEndFragment.length;
    
    // We don't want to break entirely, we just want to replace the `await addDoc/updateDoc` for candidatePool and submissions.
    // Let's replace line 1056 to 1090 with our Orchestrator call.
    code = code.replace(/await updateDoc\(doc\(db, "candidatePool", candidateDbId\)[\s\S]*candidateName: selectedCandidate.fullName \|\| selectedCandidate.name \|\| selectedCandidate.candidateId \|\| "Unknown"\n        }\);\n      }/m, `
      // Submission Orchestrator handles Identity, Ownership, Submission, Ledger
      const { SubmissionOrchestrator } = await import("../lib/workflows/SubmissionOrchestrator");
      const resp = await SubmissionOrchestrator.submitCandidate({
        candidateData: {
          id: candidateDbId,
          name: selectedCandidate.name || selectedCandidate.fullName,
          email: selectedCandidate.email || selectedCandidate.primaryEmail,
        },
        requirementId: selectedJobId,
        clientId: job.clientId,
        vendorId: userOrgId || "HQ",
        submitterId: "HQ_System",
        initialStatus: "SUBMITTED",
        matchScore: mappingResult?.matchScore || 0
      });
      
      if (!resp.success) {
        console.error("Orchestrator failed", resp.message);
      }
      
      await updateDoc(doc(db, "candidatePool", candidateDbId), {
        activeDealId: roomId,
        updatedAt: serverTimestamp(),
      });
    `);
}

replaceFinalizeDeal();

// We should also replace generateMapping adding to submissions
code = code.replace(/\/\/ 1\. Create submission document \(Single Source of Truth\)[\s\S]*pipelineStage: "Matched",/m, `
        // 1. Create submission via Orchestrator
        const { SubmissionOrchestrator } = await import("../lib/workflows/SubmissionOrchestrator");
        await SubmissionOrchestrator.submitCandidate({
          candidateData: {
            id: dbId,
            name: selectedCandidate.fullName || selectedCandidate.name,
            email: selectedCandidate.primaryEmail || selectedCandidate.email,
          },
          requirementId: jobId,
          clientId: job.clientId || "HQ",
          vendorId: userOrgId || "HQ",
          submitterId: userRole || "vendor",
          initialStatus: "MATCHED",
          matchScore: data.matchScore || 0
        });

        // 2. Update Candidate Pool
        await updateDoc(doc(db, "candidatePool", dbId), {
`);

fs.writeFileSync('src/views/CandidatesTab.tsx', code);
console.log("CandidatesTab.tsx replaced");
