const fs = require('fs');

let lines = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8').split('\n');

const newContent = `    try {
      const resumeToUse =
        selectedCandidate.resumeText ||
        \`Skills: \${getSkillsArray(selectedCandidate.skills).join(", ")}\`;
      const res = await fetch("/api/match-candidates-detailed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: job.description,
          candidateProfile: resumeToUse,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMappingResult(data);
        
        // 1. Create submission via Orchestrator
        const { SubmissionOrchestrator } = await import("../lib/workflows/SubmissionOrchestrator");
        const dbId = selectedCandidate.originalId || selectedCandidate.id;
        await SubmissionOrchestrator.submitCandidate({
          candidateData: {
            id: dbId,
            name: selectedCandidate.fullName || selectedCandidate.name || "Unknown",
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
        const { updateDoc, doc, serverTimestamp, arrayUnion } = await import("firebase/firestore");
        await updateDoc(doc(db, "candidatePool", dbId), {
          canonicalRequirementId: jobId,
          mappedJobId: jobId,
          clientId: job.clientId,
          matchScore: data.matchScore,
          matchData: data,
          activePipelines: arrayUnion(jobId),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      alert("Mapping error: " + err.message);
    } finally {
      setIsMapping(false);
    }
  };

  const finalizeDeal = async () => {
    if (!selectedCandidate || !selectedJobId || !mappingResult) return;
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return;

    const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
    const candidateDbId = selectedCandidate.originalId || selectedCandidate.id;

    try {
      const { setDoc, doc, updateDoc, serverTimestamp, collection, addDoc } = await import("firebase/firestore");
      const dealPayload = {
        id: roomId,
        requirementId: selectedJobId,
        candidateId: candidateDbId,
        vendorId: userOrgId,
        clientId: job.clientId,
        candidateName: selectedCandidate.name,
        jobTitle: job.title || "Strategic Role",
        experience: selectedCandidate.experience || "Not Specified",
        status: "ACTIVE",
        currentStage: "shortlisted",
        identitiesRevealed: false,
        createdAt: serverTimestamp(),
        matchData: mappingResult,
      };

      await setDoc(doc(db, "dealRooms", roomId), dealPayload);

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
      
      await addDoc(collection(db, "notifications"), {
        id: \`NOTIF-\${Date.now()}\`,
        recipientId: job.clientId,
        title: "New Submission",
        text: \`A candidate has been submitted for \${job.title}. Deal Room DR-\${roomId.slice(0, 6)} is now active.\`,
        read: false,
        type: "DEAL_ROOM",
        createdAt: serverTimestamp(),
      });
      
    } catch (e) {
      console.error(e);
    }
  };
`;

// Replace lines 971 to 1687 (which is index 970 to 1686 in 0-indexed array)
lines.splice(970, 1687 - 970 + 1, newContent);

fs.writeFileSync('src/views/CandidatesTab.tsx', lines.join('\\n'));
console.log("Fixed candidates tab");
