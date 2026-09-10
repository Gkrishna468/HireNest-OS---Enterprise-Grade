import React, { useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  AlertTriangle,
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  ShieldCheck,
  Bell,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../lib/Button";
import { Badge } from "../../lib/Badge";
import { cn } from "../../lib/utils";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { unifiedRequirementsService } from "../../services/unifiedRequirementsService";
import { AccessControlService } from "../../services/accessControlService";
import {
  ResumeIngestionService,
  StructuredCandidateIngestion,
} from "../../services/resumeIngestionService";

interface AddDirectCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (candidate: any, strongMatches: any[]) => void;
}

export const AddDirectCandidateModal: React.FC<AddDirectCandidateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [sourceType, setSourceType] = useState<"FILE" | "DRIVE">("FILE");

  // Form State: Starts empty, populated strictly from parsed resume or manual recruiter edits
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState(""); // "" means NOT SPECIFIED in resume
  const [experienceYears, setExperienceYears] = useState("");
  const [skillsStr, setSkillsStr] = useState("");
  const [expectedCtc, setExpectedCtc] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");

  // Ingestion state & metadata provenance
  const [ingestionResult, setIngestionResult] = useState<StructuredCandidateIngestion | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Automation Options
  const [autoMatch, setAutoMatch] = useState(true);
  const [notifyStrongMatches, setNotifyStrongMatches] = useState(true);

  // Flow & Modal State
  const [step, setStep] = useState<"INPUT" | "MATCHING" | "RESULT">("INPUT");
  const [duplicateCandidate, setDuplicateCandidate] = useState<any | null>(null);
  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [createdCandidateId, setCreatedCandidateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const applyIngestion = (result: StructuredCandidateIngestion) => {
    setIngestionResult(result);
    setParseError(null);

    // Populate form strictly from parsed resume
    if (result.identity.fullName.value) {
      setFullName(result.identity.fullName.value);
    }
    if (result.identity.email.value) {
      setEmail(result.identity.email.value);
    }
    if (result.identity.phone.value) {
      setPhone(result.identity.phone.value);
    }
    if (result.professional.currentTitle.value) {
      setCurrentRole(result.professional.currentTitle.value);
    }
    if (result.professional.currentCompany.value) {
      setCurrentCompany(result.professional.currentCompany.value);
    }
    if (result.professional.totalExperienceYears.value !== null) {
      setExperienceYears(String(result.professional.totalExperienceYears.value));
    }
    if (result.professional.skills.value && result.professional.skills.value.length > 0) {
      setSkillsStr(result.professional.skills.value.join(", "));
    }
    if (result.location.currentLocation.value) {
      setLocation(result.location.currentLocation.value);
    }
    // Work Mode: populated ONLY if explicitly detected; never guessed!
    if (result.preferences.workMode.value) {
      setWorkMode(result.preferences.workMode.value);
    } else {
      setWorkMode("");
    }
    // Notice Period
    if (result.preferences.noticePeriod.value) {
      setNoticePeriod(result.preferences.noticePeriod.value);
    }
    // Expected Compensation
    if (result.preferences.expectedCompensation.value) {
      setExpectedCtc(result.preferences.expectedCompensation.value);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);

    try {
      const result = await ResumeIngestionService.ingestResumeFromFile(selectedFile, {
        userId: auth.currentUser?.uid || "system",
        forceRescan: true,
      });
      applyIngestion(result);
    } catch (err: any) {
      console.warn("[AddDirectCandidateModal] Ingestion warning:", err.message);
      setParseError(err.message || "Failed to extract text from file. Please enter details manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const processDriveLink = async () => {
    if (!driveUrl.trim()) return;
    setIsParsing(true);
    setParseError(null);

    try {
      const result = await ResumeIngestionService.ingestResumeFromDrive(driveUrl.trim(), {
        userId: auth.currentUser?.uid || "system",
        forceRescan: true,
      });
      applyIngestion(result);
    } catch (err: any) {
      console.warn("[AddDirectCandidateModal] Drive ingestion error:", err.message);
      setParseError(err.message || "Could not retrieve document from Google Drive. Please verify sharing permissions.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Validation: Full Name and valid Email are strictly required before proceeding
  const isIdentityComplete = Boolean(
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes("@")
  );

  const isFormValid = Boolean(
    isIdentityComplete &&
    (file || driveUrl.trim() || ingestionResult)
  );

  const executePipeline = async () => {
    if (!isIdentityComplete) {
      alert("Please provide the candidate's Full Name and Email Address.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Deduplication check via Firestore candidatePool
      const targetEmail = email.trim().toLowerCase();
      const qDup = query(
        collection(db, "candidatePool"),
        where("email", "==", targetEmail)
      );
      const dupSnap = await getDocs(qDup);

      if (!dupSnap.empty) {
        const existingDoc = dupSnap.docs[0];
        setDuplicateCandidate({ id: existingDoc.id, ...existingDoc.data() });
        setIsSubmitting(false);
        return; // Pause for user decision
      }

      await proceedWithCreation();
    } catch (err) {
      console.error("[AddDirectCandidateModal] Pipeline error:", err);
      alert("Error checking candidate pool. Proceeding with creation.");
      await proceedWithCreation();
    }
  };

  const proceedWithCreation = async () => {
    setIsSubmitting(true);
    setStep("MATCHING");

    try {
      const currentUserUid = auth.currentUser?.uid || "user-1";
      const skillsList = skillsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const parsedExpYears = parseFloat(experienceYears) || 0;

      // Immutable provenance metadata & Candidate 360 profile
      const candDoc = {
        name: fullName.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        currentRole: currentRole.trim() || null,
        title: currentRole.trim() || null,
        currentCompany: currentCompany.trim() || null,
        location: location.trim() || "Not specified",
        workMode: workMode || "NOT_SPECIFIED",
        experienceYears: parsedExpYears,
        experience: parsedExpYears > 0 ? `${parsedExpYears} Years` : "Not specified",
        skills: skillsList,
        normalizedSkills: ingestionResult?.professional.skills.value || skillsList,
        employmentHistory: ingestionResult?.professional.employmentHistory || [],
        education: ingestionResult?.education || [],
        certifications: ingestionResult?.certifications || [],
        summary: ingestionResult?.summary || `${fullName.trim()} is an applicant.`,
        expectedCtc: expectedCtc.trim() || "Not specified",
        noticePeriod: noticePeriod.trim() || "Not specified",
        sourceType: "DIRECT_CANDIDATE",
        directSource: sourceType === "DRIVE" ? "GOOGLE_DRIVE" : "MANUAL_UPLOAD",
        sourceMetadata: {
          ingestedAt: new Date().toISOString(),
          sourceDocumentId: driveUrl || file?.name || null,
          originalFileName: file?.name || (driveUrl ? "Google_Drive_Resume.pdf" : "Candidate_CV.pdf"),
          uploadedByUserId: currentUserUid,
          extractionMethod: ingestionResult?.extraction.extractionMethod || "DETERMINISTIC_EXTRACTION",
          parserVersion: ingestionResult?.extraction.parserVersion || "2.5.0-deterministic",
          confidence: ingestionResult?.extraction.overallConfidence || "medium",
          evidence: {
            workMode: ingestionResult?.preferences.workMode.evidence || (workMode ? `Manual: ${workMode}` : "Not specified in resume"),
            experience: ingestionResult?.professional.totalExperienceYears.evidence || "Not specified",
            identity: ingestionResult?.identity.fullName.evidence || "User specified",
          },
        },
        resumeVersions: [
          {
            version: 1,
            uploadedAt: new Date().toISOString(),
            uploadedByUserId: currentUserUid,
            fileName: file?.name || (driveUrl ? "Google_Drive_Resume.pdf" : "Candidate_CV.pdf"),
            driveUrl: driveUrl || null,
            parsedSkills: skillsList,
            fieldsExtractedCount: ingestionResult?.extraction.fieldsExtractedCount || 0,
          },
        ],
        currentResumeVersion: 1,
        driveUrl: driveUrl || null,
        status: "NEW_APP",
        fitmentScore: 0,
        matchScore: 0,
        ownershipConflict: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "candidatePool"), candDoc);
      setCreatedCandidateId(ref.id);

      // Fetch AUTHORIZED + OPERATIONAL requirements (ACTIVE + PUBLISHED) via centralized resolver
      let matches: any[] = [];
      if (autoMatch) {
        const accessContext = AccessControlService.buildAccessContext(
          auth.currentUser
            ? {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email || "",
                role: "RECRUITER",
                organizationId: "HQ",
              }
            : null
        );

        const activeReqs =
          await unifiedRequirementsService.getAuthorizedOperationalRequirements(
            accessContext
          );

        matches = activeReqs
          .map((req: any) => {
            const reqSkills: string[] = Array.isArray(req.skillsRequired)
              ? req.skillsRequired
              : (req.skills || "")
                  .toString()
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean);

            const matchedSkills = reqSkills.filter((sk) =>
              skillsList.some((cs) =>
                cs.toLowerCase().includes(sk.toLowerCase())
              )
            );

            // 7-Point Scoring Engine
            const skillPct =
              reqSkills.length > 0
                ? (matchedSkills.length / reqSkills.length) * 35
                : 30;
            
            const expPct =
              candDoc.experienceYears >= (req.experienceYearsMin || 3)
                ? 20
                : candDoc.experienceYears > 0 ? 12 : 5;

            // Work mode comparison: if not specified, grant baseline 7 pts
            const workModePct =
              candDoc.workMode === (req.workMode || "REMOTE")
                ? 10
                : candDoc.workMode === "NOT_SPECIFIED"
                ? 7
                : 4;

            const rolePct = candDoc.currentRole && (req.title || "")
              .toLowerCase()
              .includes((candDoc.currentRole || "").toLowerCase().split(" ")[0])
              ? 15
              : 8;

            const compPct = 10;
            const availPct = candDoc.noticePeriod && candDoc.noticePeriod.toLowerCase().includes("immediate") ? 5 : 3;
            const domainPct = 5;

            const totalScore = Math.min(
              98,
              Math.round(
                skillPct +
                  expPct +
                  workModePct +
                  rolePct +
                  compPct +
                  availPct +
                  domainPct
              )
            );

            let matchTier: "IMMEDIATE_ALERT" | "STRONG_ALERT" | "QUEUE" | "LOW" = "LOW";
            if (totalScore >= 90) matchTier = "IMMEDIATE_ALERT";
            else if (totalScore >= 85) matchTier = "STRONG_ALERT";
            else if (totalScore >= 75) matchTier = "QUEUE";

            return {
              requirementId: req.id,
              jobTitle: req.title || "Software Requirement",
              clientName: req.clientName || req.clientId || "Direct Client",
              workMode: req.workMode || "REMOTE",
              matchScore: totalScore,
              matchTier,
              evidence: [
                `✓ ${matchedSkills.length}/${reqSkills.length || 5} required skills matched (${matchedSkills.slice(0, 3).join(", ") || "Core skills"})`,
                `✓ ${candDoc.experienceYears || 0} years experience vs ${req.experienceYearsMin || 3}+ required`,
                candDoc.workMode === "NOT_SPECIFIED"
                  ? `ℹ Candidate work mode is not specified (open to ${req.workMode || "REMOTE"})`
                  : `✓ ${candDoc.workMode} work mode aligned with requirement`,
                candDoc.currentRole ? `✓ Role (${candDoc.currentRole}) aligns with position` : `ℹ General alignment with job description`,
                `✓ Availability: ${candDoc.noticePeriod}`,
              ],
              matchedSkills,
            };
          })
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);

        if (matches.length > 0) {
          await updateDoc(doc(db, "candidatePool", ref.id), {
            fitmentScore: matches[0].matchScore,
            matchScore: matches[0].matchScore,
            appliedJobTitle: matches[0].jobTitle,
          });
        }

        // Store matches in candidate_matches and send notification if matchScore >= 85
        for (const m of matches) {
          await addDoc(collection(db, "candidate_matches"), {
            candidateId: ref.id,
            candidateName: candDoc.fullName,
            requirementId: m.requirementId,
            jobTitle: m.jobTitle,
            clientName: m.clientName,
            matchScore: m.matchScore,
            matchTier: m.matchTier,
            evidence: m.evidence,
            status: "NEW_MATCH",
            createdAt: serverTimestamp(),
          });

          if (notifyStrongMatches && m.matchScore >= 85) {
            const isImmediate = m.matchScore >= 90;
            await addDoc(collection(db, "notifications"), {
              type: "CANDIDATE_JOB_MATCH",
              title: isImmediate
                ? "🔴 Immediate Alert: Critical Match (90%+)"
                : "🟠 Strong Match Alert (85-89%)",
              candidateName: candDoc.fullName,
              candidateId: ref.id,
              requirementId: m.requirementId,
              requirementTitle: m.jobTitle,
              fitmentScore: m.matchScore,
              message: `Direct Candidate ${candDoc.fullName} matched operational requirement ${m.jobTitle} with ${m.matchScore}% score.`,
              actionUrl: "/candidates",
              status: "UNREAD",
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      setMatchedJobs(matches);
      setStep("RESULT");

      if (onSuccess) {
        onSuccess(
          { id: ref.id, ...candDoc },
          matches.filter((m) => m.matchScore >= 85)
        );
      }
    } catch (err) {
      console.error("[AddDirectCandidateModal] Creation failed:", err);
      alert("Failed to create direct candidate record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between border-b border-indigo-500/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-400/30">
                Direct Candidate Intake
              </span>
              <span className="text-xs text-slate-400">• Candidate 360 Ingestion Pipeline</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <User className="text-indigo-400 w-5 h-5" /> Add Direct Candidate
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6">

          {/* STEP: INPUT */}
          {step === "INPUT" && (
            <div className="space-y-5">
              
              {/* Source Switcher */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType("FILE")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                      sourceType === "FILE"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Resume (PDF / DOCX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("DRIVE")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                      sourceType === "DRIVE"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Google Drive Link
                  </button>
                </div>

                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Auto-Extract Active
                </span>
              </div>

              {/* Upload Box / Drive Link */}
              {sourceType === "FILE" ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-2xl p-6 text-center transition-all relative overflow-hidden"
                >
                  {isParsing && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-indigo-600 font-bold text-xs z-10">
                      <Sparkles className="w-6 h-6 animate-spin text-indigo-600 mb-1" />
                      <span>Parsing CV & Extracting Candidate 360 Profile...</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Extracting contact, skills, employment history & preferences deterministically
                      </span>
                    </div>
                  )}
                  <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Drag & drop candidate CV here</p>
                  <p className="text-[10px] text-slate-400 mb-3">Supports PDF, DOCX, or TXT up to 10MB</p>
                  <label className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                    {file ? file.name : "Choose Resume File"}
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block">
                    Google Drive Document Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... or Google Doc link"
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={processDriveLink}
                      disabled={isParsing || !driveUrl.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 shrink-0"
                    >
                      {isParsing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Ingesting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1" /> Ingest Link
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Ensure link sharing is set to &ldquo;Anyone with the link can view&rdquo; for authorized access.
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* VISUAL EXTRACTION STATUS & EVIDENCE BAR */}
              {ingestionResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-black text-slate-900">
                        Resume parsed successfully — {ingestionResult.extraction.fieldsExtractedCount} fields extracted
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                      {ingestionResult.extraction.parserVersion}
                    </Badge>
                  </div>

                  {/* Evidence Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {/* Full Name */}
                    {!ingestionResult.identity.fullName.isMissing ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" /> Full Name: {fullName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Full Name: Missing in resume
                      </span>
                    )}

                    {/* Email */}
                    {!ingestionResult.identity.email.isMissing ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" /> Email: {email}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Email: Missing in resume
                      </span>
                    )}

                    {/* Experience */}
                    {!ingestionResult.professional.totalExperienceYears.isMissing ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" /> Experience: {experienceYears} yrs (Calculated)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-500" /> Experience: Not dated in CV
                      </span>
                    )}

                    {/* Work Mode */}
                    {workMode ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" /> Work Mode: {workMode}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Work Mode: Not found in resume
                      </span>
                    )}

                    {/* Skills */}
                    {ingestionResult.professional.skills.value.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <Sparkles className="w-3 h-3 text-indigo-600" /> {ingestionResult.professional.skills.value.length} Skills Found
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                
                {/* Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Full Name *
                    </label>
                    {fullName && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Extracted
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Candidate name from resume"
                    className={cn(
                      "w-full text-xs rounded-xl p-2.5 outline-none font-medium border transition-colors",
                      !fullName ? "bg-amber-50/30 border-amber-300 focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-indigo-500"
                    )}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Email Address *
                    </label>
                    {email && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Extracted
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Candidate email address"
                    className={cn(
                      "w-full text-xs rounded-xl p-2.5 outline-none font-medium border transition-colors",
                      !email ? "bg-amber-50/30 border-amber-300 focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-indigo-500"
                    )}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Candidate phone number"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Current Role / Title */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Current Title / Designation
                  </label>
                  <input
                    type="text"
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                    placeholder="e.g. Solutions Architect"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Current Employer */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Current / Recent Employer
                  </label>
                  <input
                    type="text"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Location / Base City
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Seattle, WA or London, UK"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Work Mode - STRICT: No silent guessing */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Work Mode
                    </label>
                    {!workMode && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Not in resume
                      </span>
                    )}
                  </div>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className={cn(
                      "w-full text-xs rounded-xl p-2.5 outline-none font-medium border transition-colors",
                      !workMode
                        ? "bg-amber-50/40 border-amber-300 text-amber-900 focus:border-amber-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )}
                  >
                    <option value="">-- Work Mode: Not specified in resume --</option>
                    <option value="REMOTE">Remote (100% WFH)</option>
                    <option value="ONSITE_FTE">Onsite FTE (Full-time)</option>
                    <option value="ONSITE_CONTRACT">Onsite Contract (C2C / W2)</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                {/* Total Experience */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total Experience (Years)
                    </label>
                    {experienceYears && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Calculated
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="Calculated from timeline"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Notice Period */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Notice Period / Availability
                  </label>
                  <input
                    type="text"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    placeholder="e.g. Immediate, 30 Days (if specified)"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Expected Compensation */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Expected Compensation / Rate
                  </label>
                  <input
                    type="text"
                    value={expectedCtc}
                    onChange={(e) => setExpectedCtc(e.target.value)}
                    placeholder="e.g. $140k/yr or $85/hr (if specified)"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

              </div>

              {/* Skills */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Key Technical Skills (Extracted from resume taxonomy)
                </label>
                <input
                  type="text"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  placeholder="e.g. React, Node.js, TypeScript, PostgreSQL, AWS"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Automation Checkboxes */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMatch}
                    onChange={(e) => setAutoMatch(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Match against operational requirements (ACTIVE + PUBLISHED gate)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStrongMatches}
                    onChange={(e) => setNotifyStrongMatches(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Alert me when strong matches are identified (&ge;85% match score)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {!isIdentityComplete ? (
                  <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Full Name and Email Address are required to add candidate.
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Ready to create Candidate 360 and evaluate operational matches.
                  </span>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={executePipeline}
                    disabled={isSubmitting || !isFormValid}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" /> Add Candidate & Match
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* DEDUPLICATION CONFLICT SCREEN */}
          {duplicateCandidate && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-amber-900">Existing Candidate 360 Found</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    A candidate with email <span className="font-bold">{duplicateCandidate.email}</span> already exists in the HireNest database ({duplicateCandidate.fullName || duplicateCandidate.name}).
                  </p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs text-slate-700 space-y-1 font-mono">
                <div>Candidate ID: {duplicateCandidate.id}</div>
                <div>Role: {duplicateCandidate.currentRole || duplicateCandidate.title || "Specialist"}</div>
                <div>Source: {duplicateCandidate.sourceType || "DIRECT"}</div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                  }}
                  className="text-xs cursor-pointer"
                >
                  Close & View Existing
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const currentUserUid = auth.currentUser?.uid || "user-1";
                    const existingVersions = Array.isArray(duplicateCandidate.resumeVersions)
                      ? duplicateCandidate.resumeVersions
                      : [];

                    const newVersionNum = existingVersions.length + 1;
                    const newVersionObj = {
                      version: newVersionNum,
                      uploadedAt: new Date().toISOString(),
                      uploadedByUserId: currentUserUid,
                      fileName: file?.name || (driveUrl ? "Google_Drive_Resume.pdf" : "Updated_CV.pdf"),
                      driveUrl: driveUrl || null,
                      parsedSkills: skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
                    };

                    const updatedVersions = [...existingVersions, newVersionObj];

                    await updateDoc(doc(db, "candidatePool", duplicateCandidate.id), {
                      driveUrl: driveUrl || duplicateCandidate.driveUrl || null,
                      resumeVersions: updatedVersions,
                      currentResumeVersion: newVersionNum,
                      skills: skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
                      currentRole: currentRole || duplicateCandidate.currentRole,
                      experienceYears: parseFloat(experienceYears) || duplicateCandidate.experienceYears || 0,
                      workMode: workMode || duplicateCandidate.workMode || "NOT_SPECIFIED",
                      updatedAt: serverTimestamp(),
                    });
                    setDuplicateCandidate(null);
                    setStep("RESULT");
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs cursor-pointer"
                >
                  Update Existing Resume (v{((duplicateCandidate.resumeVersions?.length || 1) + 1)})
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDuplicateCandidate(null);
                    proceedWithCreation();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
                >
                  Create Separate Record
                </Button>
              </div>
            </div>
          )}

          {/* STEP: MATCHING */}
          {step === "MATCHING" && (
            <div className="py-12 text-center space-y-4">
              <Sparkles className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Matching Against Operational Requirements...
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Evaluating Candidate 360 profile against ACTIVE + PUBLISHED requirements using the 7-point Match Engine.
              </p>
            </div>
          )}

          {/* STEP: RESULT */}
          {step === "RESULT" && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                      Direct Candidate 360 Ingested
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      Profile, skills, provenance metadata and version history stored in candidatePool.
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                  ID: {createdCandidateId?.slice(0, 8)}
                </Badge>
              </div>

              {/* Match Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Operational Requirements Matches ({matchedJobs.length})
                </h4>
                {matchedJobs.some((m) => m.matchScore >= 85) && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center gap-1 border border-indigo-200">
                    <Bell className="w-3 h-3 text-indigo-600 animate-bounce" />
                    Strong Match Identified (&ge;85%)
                  </span>
                )}
              </div>

              {/* Match List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {matchedJobs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    No active, published requirements found for immediate matching. Candidate is indexed in global pool.
                  </div>
                ) : (
                  matchedJobs.map((m) => (
                    <div
                      key={m.requirementId}
                      className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-2xl shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="text-sm font-black text-slate-900">{m.jobTitle}</h5>
                          <span className="text-[10px] font-bold text-slate-500">
                            Client: {m.clientName} • Work Mode: {m.workMode}
                          </span>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs font-black px-2.5 py-0.5",
                            m.matchScore >= 85
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          )}
                        >
                          {m.matchScore}% Match
                        </Badge>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-[11px] text-slate-700 font-medium">
                        {m.evidence.map((ev: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 text-slate-600">
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  size="sm"
                  onClick={onClose}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 cursor-pointer"
                >
                  Done & Close
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
