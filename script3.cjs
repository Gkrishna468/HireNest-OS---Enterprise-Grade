const fs = require('fs');
let code = fs.readFileSync('src/components/modals/CandidateReviewModal.tsx', 'utf8');

const regexShortlist = /await addDoc\(collection\(db, "submissions"\), {[\s\S]*?createdAt: serverTimestamp\(\)\n        }\);/;
const replaceShortlist = `const { SubmissionOrchestrator } = await import("../../lib/workflows/SubmissionOrchestrator");
        await SubmissionOrchestrator.submitCandidate({
          candidateData: {
            id: submission.candidateId || submission.id,
            name: submission.candidateName || submission.name || "Anonymous Candidate"
          },
          requirementId: requirement.id,
          clientId: requirement.clientId || "ORG-LOCAL",
          vendorId: submission.vendorId || "ORG-EXTERNAL-VENDOR",
          submitterId: auth.currentUser?.uid || "system",
          initialStatus: "SHORTLISTED",
          matchScore: submission.matchScore || 0
        });`;

const regexReject = /await addDoc\(collection\(db, "submissions"\), {[\s\S]*?createdAt: serverTimestamp\(\)\n        }\);/;
const replaceReject = `const { SubmissionOrchestrator } = await import("../../lib/workflows/SubmissionOrchestrator");
        await SubmissionOrchestrator.submitCandidate({
          candidateData: {
            id: submission.candidateId || submission.id,
            name: submission.candidateName || submission.name || "Anonymous Candidate"
          },
          requirementId: requirement.id,
          clientId: requirement.clientId || "ORG-LOCAL",
          vendorId: submission.vendorId || "ORG-EXTERNAL-VENDOR",
          submitterId: auth.currentUser?.uid || "system",
          initialStatus: "REJECTED",
          matchScore: submission.matchScore || 0
        });`;


code = code.replace(regexShortlist, replaceShortlist);
code = code.replace(regexReject, replaceReject);

fs.writeFileSync('src/components/modals/CandidateReviewModal.tsx', code);
console.log("CandidateReviewModal updated");
