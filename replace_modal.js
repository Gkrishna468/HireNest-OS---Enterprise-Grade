// write file to replace handlesubmit
const fs = require('fs');

let file = fs.readFileSync('src/components/CandidateSubmissionModal.tsx', 'utf8');

const replacement = `  const handleSubmit = async () => {
    if (!name || !email) return;
    setIsSubmitting(true);
    
    try {
      const { SubmissionOrchestrator } = await import("../lib/workflows/SubmissionOrchestrator");
      
      let targetClientId = "";
      if (reqId !== "GENERAL") {
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const reqSnap = await getDoc(doc(db, "requirements_public", reqId));
          if (reqSnap.exists()) {
            targetClientId = reqSnap.data().clientId || "HQ";
          }
        } catch (err) {
          console.log("Could not fetch requirement for clientId", err);
        }
      }

      const response = await SubmissionOrchestrator.submitCandidate({
        candidateData: {
          name,
          email,
          phone,
          resumeText: aiAnalysis?.analysis || "",
          skills: keySkills.split(",").map((s) => s.trim()).filter(Boolean),
        },
        requirementId: reqId,
        clientId: targetClientId,
        vendorId: "local",
        submitterId: "local_user",
        initialStatus: "PENDING_REVIEW",
        matchScore: aiAnalysis?.fitScore || 0,
        aiAnalysis: aiAnalysis || null,
      });

      if (!response.success && response.ownershipDetails) {
         alert(response.message + " Owned by: " + response.ownershipDetails.owner);
         setIsSubmitting(false);
         return;
      }
      
      if (!response.success) {
         alert("Submission failed: " + response.error);
         setIsSubmitting(false);
         return;
      }

      const subRefId = response.submissionId;

      if (reqId !== "GENERAL" && subRefId) {
        // TRIGGER GOVERNANCE ENGINE
        try {
          await fetch("/api/validate-submission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId: subRefId }),
          });
        } catch (e) {
          console.error("Governance engine execution failed:", e);
        }

        await emitEvent(
          "SubmissionCreated",
          "SUBMISSION",
          subRefId,
          "local_user",
          "vendor",
          {
            candidateId: response.candidateId,
            candidateName: name,
            requirementId: reqId,
            reqTitle: reqTitle,
            aiFitScore: aiAnalysis?.fitScore || 0,
          },
        );

        // 3. INITIALIZE WORKFLOW GRAPH (NEW ENGINE)
        await workflowOrchestrator.initializeWorkflow(
          "submission_lifecycle",
          subRefId,
          SubmissionState.SUBMITTED,
          "local", // Vendor org context
          "local_user",
          "vendor_recruiter", // actorRole
          "submissions"
        );

        try {
          await fetch("/api/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "start",
              workflowType: "CandidateLifecycle",
              input: { submissionId: subRefId },
            }),
          });
        } catch (e) {
          console.log("Could not trigger workflow (may be offline)", e);
        }
      }

      onClose();
      if (typeof alert !== "undefined") {
        alert("Candidate ingested & indexed via AI. Orchestrator finalized.");
      }
    } catch (error) {
      console.error("Submission failed: ", error);
      handleFirestoreError(error, OperationType.WRITE, "candidatePool");
    } finally {
      setIsSubmitting(false);
    }
  };`

// I'll grab everything from "const handleSubmit = async () => {" down to "setIsParsing(false);" (which is right before)
const match = file.indexOf('const handleSubmit = async () => {');
if (match === -1) throw new Error("Could not find handleSubmit");
const nextFn = file.indexOf('const triggerFileInput', match) || file.indexOf('return (', match);

// replace from match to nextFn with the replacement...? No wait triggerFileInput is BEFORE handleSubmit!
const endMatch = file.indexOf('setIsSubmitting(false);\n    }\n  };', match);
if (endMatch === -1) throw new Error("Could not find end of handleSubmit");

file = file.substring(0, match) + replacement + file.substring(endMatch + 'setIsSubmitting(false);\n    }\n  };'.length);

fs.writeFileSync('src/components/CandidateSubmissionModal.tsx', file);
console.log("Replaced");
