const fs = require('fs');
let code = fs.readFileSync('src/components/CandidateSubmissionModal.tsx', 'utf8');

const startStr = "  const handleSubmit = async () => {\n    if (!name || !email) return;\n    setIsSubmitting(true);\n    try {";
const endStr = "  };\n\n  return (\n    <div className=\"fixed inset-0";

const matchStart = code.indexOf(startStr);
const matchEnd = code.indexOf(endStr);

if(matchStart === -1 || matchEnd === -1) {
  console.log("Could not find", matchStart, matchEnd);
  process.exit(1);
}

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
         alert("Blocked: " + response.message);
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

        // INITIALIZE WORKFLOW GRAPH
        await workflowOrchestrator.initializeWorkflow(
          "submission_lifecycle",
          subRefId,
          SubmissionState.SUBMITTED,
          "local", // Vendor org context
          "local_user",
          "vendor_recruiter", // actorRole
          "submissions"
        );
      }

      onClose();
      if (typeof alert !== "undefined") {
        alert("Candidate ingested & indexed via AI. Orchestrated successfully.");
      }
    } catch (error) {
      console.error("Submission failed: ", error);
      handleFirestoreError(error, OperationType.WRITE, "candidatePool");
    } finally {
      setIsSubmitting(false);
    }
`;

code = code.substring(0, matchStart) + replacement + code.substring(matchEnd);
fs.writeFileSync('src/components/CandidateSubmissionModal.tsx', code);
console.log("Replaced");
