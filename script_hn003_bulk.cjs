const fs = require('fs');

let c = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8');

c = \`import { BulkUploadProcess } from "../components/BulkUploadProcess";\\n\` + c;

c = c.replace(/\\/\\* Bulk Upload logic \\*\\/[\\s\\S]*?\\{showBulkUpload && \\([\\s\\S]*?\\n\\s*\\)\\}/, \`{showBulkUpload && (
          <BulkUploadProcess
             onClose={() => setShowBulkUpload(false)}
             userOrgId={userOrgId || "HQ"}
             onImport={async (imported) => {
                 setShowBulkUpload(false);
                 setProcessingStats({ show: true, processing: imported.length, total: imported.length, parsed: 0, matched: 0 });
                 const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
                 
                 let count = 0;
                 for(const c of imported) {
                    const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
                    await setDoc(doc(db, "candidatePool", candId), {
                      fullName: c.name,
                      name: c.name,
                      primaryEmail: "pending@extraction.io",
                      email: "pending@extraction.io",
                      candidateId: candId,
                      vendorId: userOrgId || "HQ",
                      sourceOrganizations: [userOrgId || "HQ"],
                      pipelineStage: "Added",
                      source: "Bulk Upload",
                      resumeText: c.extractedText,
                      fileName: c.fileName,
                      status: "QUEUED",
                      distillationStatus: "PROCESSING",
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    });
                    
                    enrichCandidate(candId, c.extractedText);
                    count++;
                 }
             }}
          />
        )}\`);

fs.writeFileSync('src/views/CandidatesTab.tsx', c);
console.log('Fixed Bulk Upload Redesign in Candidates Tab');
