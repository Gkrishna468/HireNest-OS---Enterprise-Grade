import { useState, useRef } from "react";
import { Upload, X, Bot, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "../lib/Button";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc
} from "firebase/firestore";
import { workflowOrchestrator } from "../services/workflow/workflowOrchestrator";
import { SubmissionState, WorkflowInstance } from "../types/workflow";
import { emitEvent } from "../services/eventBus";
import { publishEvent } from "../lib/eventEngine";

interface CandidateSubmissionModalProps {
  onClose: () => void;
  reqId: string;
  reqTitle: string;
}

export default function CandidateSubmissionModal({
  onClose,
  reqId,
  reqTitle,
}: CandidateSubmissionModalProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [keySkills, setKeySkills] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [expectedCtc, setExpectedCtc] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsParsing(true);
    const file = e.target.files[0];

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          // Now pass extracted text to the intel parser via bulk-parse-resumes or similar.
          // Here we can use the same AI distillation used in bulk upload
          const intelRes = await fetch("/api/bulk-parse-resumes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ resumeTexts: [data.text] }),
          });

          if (intelRes.ok) {
            const intelData = await intelRes.json();
            if (intelData && intelData.length > 0) {
              const profile = intelData[0];
              setName(profile.name || "");
              setEmail(
                profile.email?.includes("pending@") ? "" : profile.email || "",
              );
              setPhone(profile.phone || "");
              setExperience(profile.experience || "");
              setKeySkills(
                Array.isArray(profile.skills)
                  ? profile.skills.join(", ")
                  : profile.skills || "",
              );

              const analysis = {
                fitScore: 88,
                skills: profile.skills || [],
                analysis: profile.summary || "Parsed from document.",
                authenticity: "Parsed from document",
              };
              setAiAnalysis(analysis);
              setParsed(true);
            }
          }
        }
      } else {
        console.error("Extraction failed");
      }
    } catch (err) {
      console.error("AI Parsing Error:", err);
    }
    setIsParsing(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!name || !email) return;
    setIsSubmitting(true);
    try {
      // 1. ALWAYS GET/CREATE THE CANONICAL CANDIDATE RECORD FIRST
      // First check for a deterministic match via hash / email
      const candQuery = query(collection(db, "candidatePool"), where("email", "==", email));
      const existingSnap = await getDocs(candQuery);
      
      let candidateId = "";
      
      if (!existingSnap.empty) {
        // Merge into existing candidate
        candidateId = existingSnap.docs[0].id;
        const candData = existingSnap.docs[0].data();
        
        await updateDoc(doc(db, "candidatePool", candidateId), {
          updatedAt: serverTimestamp(),
          resumeText: aiAnalysis?.analysis || candData.resumeText || "",
          skills: keySkills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      } else {
        // Safe creation of new candidate
        const candRef = await addDoc(collection(db, "candidatePool"), {
          // Updated Canonical Candidate Schema
          fullName: name,
          primaryEmail: email,
          phoneHash: phone,
          linkedin: "",
          skills: keySkills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          experience: experience, // In a real system, this would be structured data
          canonicalProfile: true,
          visibilityScopes: ["VENDOR_NETWORK"], // Example
          sourceOrganizations: ["local"], // Or current vendor org ID
          dedupeFingerprint: email.toLowerCase(), // Simple dedupe hash for now

          // Legacy payload mappings for backward compatibility during migration
          name: name,
          email: email,
          phone: phone,
          location: currentLocation,
          preferredLocation,
          noticePeriod,
          currentCtc,
          expectedCtc,
          resumeText: aiAnalysis?.analysis || "",
          vendorId: "local",
          pipelineStage: "Candidate Added",
          status: "QUEUED",
          source: "Manual Intake UI",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: "local_user",
        });
        candidateId = candRef.id;
      }

      await emitEvent(
        "CandidateUploaded",
        "CANDIDATE",
        candidateId,
        "local_user",
        "vendor",
        {
          name: name,
          email: email,
          source: "Manual Intake UI",
        },
      );

      // 2. IF NOT GENERAL, CREATE THE INTERSECTION "SUBMISSION"
      if (reqId !== "GENERAL") {
        let targetClientId = "";
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const reqSnap = await getDoc(doc(db, "requirements_public", reqId));
          if (reqSnap.exists()) {
            targetClientId = reqSnap.data().clientId || "";
          }
        } catch (err) {
          console.log("Could not fetch requirement for clientId", err);
        }

        // Check if submission exists
        try {
          const { getDocs, query, collection, where } =
            await import("firebase/firestore");
          const q = query(
            collection(db, "submissions"),
            where("candidateId", "==", candidateId),
            where("requirementId", "==", reqId),
            where("vendorOrgId", "==", "local"),
          );
          const existing = await getDocs(q);
          if (!existing.empty) {
            alert(
              "This candidate has already been submitted to this requirement.",
            );
            setIsSubmitting(false);
            return;
          }
        } catch (e) {}

        const subRef = await addDoc(collection(db, "submissions"), {
          // Updated Submission Schema
          canonicalRequirementId: reqId,
          candidateId: candidateId,
          requirementId: reqId,
          submittedBy: "local_user",
          vendorOrgId: "local",
          clientOrgId: targetClientId, // Would be determined by requirement
          clientId: targetClientId,
          status: "PENDING_REVIEW",
          matchScore: aiAnalysis?.fitScore || 0,
          timeline: [
            { action: "submitted", timestamp: new Date().toISOString() },
          ],

          // Legacy mappings
          reqId,
          reqTitle,
          candidateName: name,
          candidateEmail: email,
          candidatePhone: phone,
          experience,
          currentLocation,
          preferredLocation,
          keySkills,
          noticePeriod,
          currentCtc,
          expectedCtc,
          aiFitScore: aiAnalysis?.fitScore || 0,
          aiAnalysisText: aiAnalysis?.analysis || "",
          submittedAt: serverTimestamp(),
          stage: "NEW",
        });

        // TRIGGER GOVERNANCE ENGINE
        try {
          await fetch("/api/validate-submission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId: subRef.id }),
          });
        } catch (e) {
          console.error("Governance engine execution failed:", e);
        }

        await emitEvent(
          "SubmissionCreated",
          "SUBMISSION",
          subRef.id,
          "local_user",
          "vendor",
          {
            candidateId: candidateId,
            candidateName: name,
            requirementId: reqId,
            reqTitle: reqTitle,
            aiFitScore: aiAnalysis?.fitScore || 0,
          },
        );

        await publishEvent({
          type: "info",
          title: "Candidate Submitted",
          message: `${name} has been floated to the client for ${reqTitle}.`,
          actionUrl: "/deal-rooms",
          recipients: ["GLOBAL_ADMIN", "GLOBAL_CLIENT", "GLOBAL_VENDOR"],
        });

        // 3. INITIALIZE WORKFLOW GRAPH (NEW ENGINE)
        await workflowOrchestrator.initializeWorkflow(
          "submission_lifecycle",
          subRef.id,
          SubmissionState.SUBMITTED,
          "local", // Vendor org context
          "local_user",
          "vendor_recruiter", // actorRole
          "submissions",
        );

        try {
          await fetch("/api/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "start",
              workflowType: "CandidateLifecycle",
              input: { submissionId: subRef.id },
            }),
          });
        } catch (e) {
          console.log("Could not trigger workflow (may be offline)", e);
        }
      }

      onClose();
    } catch (error) {
      console.error("Submission failed: ", error);
      handleFirestoreError(error, OperationType.WRITE, "candidatePool");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm sm:items-center items-end">
      <div className="bg-slate-900 w-full max-w-2xl sm:rounded-[24px] rounded-t-[24px] rounded-b-none shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Add Candidate Profile
            </h2>
            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">
              POST: {reqTitle} ({reqId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide text-slate-300 space-y-5">
          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="E.g. Alex Chen"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="E.g. alex@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="E.g. +91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Total Experience
              </label>
              <input
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="E.g. 5 Years"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Current Location
              </label>
              <input
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Search or select country, city, town"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Preferred Location
              </label>
              <input
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Search or select country, city, town"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Key Skills
            </label>
            <input
              value={keySkills}
              onChange={(e) => setKeySkills(e.target.value)}
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="E.g. React, TypeScript, Redux Toolkit"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Notice Period / Availability
              </label>
              <input
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="E.g. Immediate / 30 D..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Current CTC
              </label>
              <input
                value={currentCtc}
                onChange={(e) => setCurrentCtc(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="E.g. 10 LPA"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Expected CTC
              </label>
              <input
                value={expectedCtc}
                onChange={(e) => setExpectedCtc(e.target.value)}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="E.g. 15 LPA"
              />
            </div>
          </div>

          {/* Resume Upload Box */}
          <div className="pt-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Upload a Resume
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />

            {!parsed && !isParsing && (
              <div
                onClick={triggerFileInput}
                className="border-2 border-dashed border-slate-700 bg-slate-800/30 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/80 transition-all group"
              >
                <Upload
                  size={32}
                  className="text-indigo-400 mx-auto mb-3 group-hover:-translate-y-1 transition-transform"
                />
                <p className="text-sm font-semibold text-slate-300 mb-1">
                  Drag & drop or Click to attach Resume document
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Supports PDF, DOC, DOCX, TXT. Parses metadata.
                </p>
              </div>
            )}

            {isParsing && (
              <div className="border border-indigo-500/30 rounded-2xl p-8 text-center bg-indigo-500/5">
                <Bot
                  size={32}
                  className="text-indigo-400 mx-auto mb-4 animate-pulse"
                />
                <p className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-3">
                  AI Extracting Metadata...
                </p>
                <div className="h-1.5 w-48 bg-slate-800 mx-auto rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[60%] animate-pulse" />
                </div>
              </div>
            )}

            {parsed && aiAnalysis && (
              <div className="border border-emerald-500/30 rounded-2xl p-6 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex flex-shrink-0 items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1 text-sm">
                  <h4 className="font-bold text-emerald-300 mb-1">
                    Resume Attached & AI Parsed
                  </h4>
                  <p className="text-slate-400 text-xs">
                    Metadata has been intelligently extracted to fill the fields
                    above.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300 text-xs h-8 px-4"
                  onClick={triggerFileInput}
                >
                  Replace File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-800 bg-slate-900 shrink-0 flex justify-end gap-3 rounded-b-[24px]">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl px-6"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium px-6 shadow-lg shadow-indigo-500/20"
            disabled={isSubmitting || !name || !email}
          >
            {isSubmitting ? "Committing..." : "Submit candidate profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
