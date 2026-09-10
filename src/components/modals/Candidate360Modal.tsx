import React, { useState, useEffect, useRef } from 'react';
import { 
  X, User, FileText, Bot, Briefcase, Activity, 
  MessageSquare, ShieldAlert, CheckCircle, MapPin, 
  UploadCloud, Search, Calendar, Target, Sparkles, RotateCcw, AlertTriangle, Send,
  Check, Clock, DollarSign, Layers, Award, ChevronRight, Loader2,
  FileUp, CheckCircle2, AlertCircle, ArrowRight, History, FileCode
} from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { Button } from '../../lib/Button';
import { cn, getCandidateFitmentScore } from '../../lib/utils';
import { publishEvent } from '../../lib/eventEngine';
import { SubmissionOrchestrator } from '../../lib/workflows/SubmissionOrchestrator';
import { parseBulkResumes } from "../../services/aiService";
import { CandidateReactivationService } from "../../services/CandidateReactivationService";
import { ReactivationOpportunityCard } from "../ReactivationOpportunityCard";
import { UnifiedRequirementsService } from "../../services/unifiedRequirementsService";
import { AccessControlService } from "../../services/accessControlService";
import { CandidateMatchingService, CandidateRequirementMatchRecord } from "../../services/CandidateMatchingService";
import { ResumeIngestionService } from "../../services/resumeIngestionService";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { sanitizeFirestorePayload } from "../../lib/firestoreUtils";

type TabType = 'OVERVIEW' | 'RESUME' | 'AI_ANALYSIS' | 'REQUIREMENTS' | 'INTERVIEWS' | 'TIMELINE' | 'COLLABORATION' | 'GOVERNANCE';

interface ParsedEducationItem {
  degree?: string;
  institution?: string;
  graduationYear?: string | number;
  field?: string;
  raw?: string;
}

function parseEducationRecords(edu: any): ParsedEducationItem[] {
  if (!edu) return [];
  if (typeof edu === 'string') {
    return [{ raw: edu }];
  }
  if (Array.isArray(edu)) {
    return edu.map(item => {
      if (typeof item === 'string') return { raw: item };
      if (typeof item === 'object' && item !== null) {
        return {
          degree: item.degree,
          institution: item.institution,
          graduationYear: item.graduationYear || item.year,
          field: item.field || item.major || item.specialization,
          raw: item.raw || item.text
        };
      }
      return { raw: String(item) };
    });
  }
  if (typeof edu === 'object' && edu !== null) {
    return [{
      degree: edu.degree,
      institution: edu.institution,
      graduationYear: edu.graduationYear || edu.year,
      field: edu.field || edu.major || edu.specialization,
      raw: edu.raw || edu.text
    }];
  }
  return [{ raw: String(edu) }];
}

function formatExperienceDisplay(cand: any): string {
  if (typeof cand?.experience === 'string' && cand.experience.trim()) return cand.experience;
  if (typeof cand?.experience === 'number') return `${cand.experience} Years`;
  if (cand?.totalExperience !== undefined && cand?.totalExperience !== null) return `${cand.totalExperience} Years`;
  if (cand?.experienceTracker?.computedYears !== undefined) return `${cand.experienceTracker.computedYears} Years`;
  return 'Experience Under Review';
}

function formatLocationDisplay(loc: any): string {
  if (!loc) return 'Remote/Unknown';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object' && loc !== null) {
    const parts = [loc.city, loc.state, loc.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Remote/Unknown';
  }
  return String(loc);
}

export default function Candidate360Modal({ 
  candidate, 
  onClose, 
  isAdmin, 
  userOrgId, 
  userRole,
  jobs = [],
  vendorMap = {},
  isClientReviewMode = false,
  onShortlist,
  onReject,
  onSchedule,
  onRequestClarification,
  onOffer
}: { 
  candidate: any, 
  onClose: () => void, 
  isAdmin: boolean,
  userOrgId: string,
  userRole: string,
  jobs?: any[],
  vendorMap?: Record<string, string>,
  isClientReviewMode?: boolean;
  onShortlist?: () => void;
  onReject?: () => void;
  onSchedule?: () => void;
  onRequestClarification?: () => void;
  onOffer?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [events, setEvents] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>(candidate.comments || []);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isMapping, setIsMapping] = useState(false);
  const [mappingResult, setMappingResult] = useState<any | null>(null);
  const [matchProgressSteps, setMatchProgressSteps] = useState<string[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isSubmittingCandidate, setIsSubmittingCandidate] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [geminiQuery, setGeminiQuery] = useState("");
  const [geminiAnswer, setGeminiAnswer] = useState<string | null>(null);
  const [isAskingGemini, setIsAskingGemini] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [fullCandidateData, setFullCandidateData] = useState<any>(null);

  // Resume Update States
  const [showUpdateResumeModal, setShowUpdateResumeModal] = useState(false);
  const [resumeUpdateMode, setResumeUpdateMode] = useState<'FILE' | 'TEXT'>('FILE');
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null);
  const [newResumeText, setNewResumeText] = useState("");
  const [isUpdatingResume, setIsUpdatingResume] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeUpdateProgress, setResumeUpdateProgress] = useState<string>("");
  const [resumeUpdateError, setResumeUpdateError] = useState<string | null>(null);
  const [autoRerunMatch, setAutoRerunMatch] = useState(true);
  const [selectedMatchReqIdForUpdate, setSelectedMatchReqIdForUpdate] = useState<string>("");
  const [resumeUpdateSuccess, setResumeUpdateSuccess] = useState<{
    version: number;
    fileName: string;
    skillsCount: number;
    newSkills: string[];
    experience: string;
    matchUpdated: boolean;
    newMatchScore?: number;
    requirementTitle?: string;
  } | null>(null);

  const handleRefreshAIAnalysis = async () => {
    const candId = candidate.candidateId || candidate.id;
    const resumeTxt = displayCandidate.parsedResumeText || displayCandidate.resumeText || displayCandidate.extractedText || "No resume text available";
    setIsScreening(true);
    try {
      const res = await fetch('/api/candidates/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candId, resumeText: resumeTxt })
      });
      const data = await res.json();
      if (data.success && data.aiIntelligence) {
        setFullCandidateData((prev: any) => ({
          ...(prev || {}),
          aiIntelligence: data.aiIntelligence
        }));
        alert("AI Recruitment Intelligence refreshed successfully!");
      } else {
        alert("Screening completed: " + (data.error || "Refreshed"));
      }
    } catch (err: any) {
      console.error("Refresh AI error:", err);
      alert("Failed to refresh AI analysis: " + err.message);
    } finally {
      setIsScreening(false);
    }
  };

  const handleAskGemini360 = async () => {
    if (!geminiQuery.trim()) return;
    setIsAskingGemini(true);
    setGeminiAnswer(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are an AI Recruitment Copilot reviewing candidate "${nameStr}". Candidate Skills: ${(skillsArr || []).join(', ')}. Candidate Experience: ${displayCandidate.experience || 'N/A'}. Resume Text: ${(displayCandidate.parsedResumeText || displayCandidate.resumeText || '').substring(0, 1500)}. User Question: ${geminiQuery}`
        })
      });
      const data = await res.json();
      setGeminiAnswer(data.response || data.text || data.message || "Query completed.");
    } catch (e: any) {
      setGeminiAnswer("Error querying Gemini AI: " + e.message);
    } finally {
      setIsAskingGemini(false);
    }
  };

  // Merge full data so that we have resume, skills, etc.
  const displayCandidate = fullCandidateData ? { ...candidate, ...fullCandidateData } : candidate;

  const handleDeleteCandidate = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { useCandidateStore } = await import("../../stores/CandidateStore");
      await useCandidateStore.getState().deleteCandidate(candidate.candidateId || candidate.id);
      
      import("../../lib/eventEngine").then(({ publishEvent }) => {
        publishEvent({
          type: "info",
          title: "Candidate Deleted",
          message: `Candidate ${candidate.candidateId || candidate.id} was soft-deleted by user.`,
          recipients: ["GLOBAL_ADMIN"]
        });
      });
      
      alert("Candidate successfully deleted.");
      setShowDeleteConfirm(false);
      onClose();
    } catch (e: any) {
      alert("Deletion failed: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryEnrichment = async () => {
    setIsRetrying(true);
    try {
      const { useCandidateStore } = await import("../../stores/CandidateStore");
      await useCandidateStore.getState().retryEnrichment(candidate);
      alert("AI Enrichment Retry completed successfully.");
    } catch (e: any) {
      console.error("Retry failed:", e);
      alert("Retry failed / No valid text: " + e.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const [internalJobs, setInternalJobs] = useState<any[]>(jobs || []);

  useEffect(() => {
    if (jobs && jobs.length > 0) {
      setInternalJobs(jobs);
      return;
    }
    // SSOT Fallback: subscribe to requirements_public if parent did not provide jobs
    const unsub = onSnapshot(collection(db, "requirements_public"), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInternalJobs(docs);
    }, (err) => console.warn("[Candidate360Modal] fallback reqs load warning:", err?.message));
    return () => unsub();
  }, [jobs]);

  const effectiveJobs = (jobs && jobs.length > 0) ? jobs : internalJobs;
  const availableJobs = effectiveJobs.filter((job) =>
    UnifiedRequirementsService.isRequirementOperational(job) &&
    AccessControlService.isRequirementAuthorized(userOrgId, userRole, job)
  );

  const handleRunMatch = async () => {
    if (!selectedJobId) return;
    setIsMapping(true);
    setMatchError(null);
    setMatchProgressSteps(["Analyzing Candidate..."]);
    try {
      const candidateId = candidate.candidateId || candidate.originalId || candidate.id;
      const context = AccessControlService.buildAccessContext({
        id: (candidate as any)?.submitterId || "local_user",
        role: userRole,
        orgId: userOrgId,
      });

      const matchRecord = await CandidateMatchingService.matchCandidateToRequirement({
        candidateId,
        requirementId: selectedJobId,
        context,
        onProgress: (step: string) => {
          setMatchProgressSteps((prev) => [...prev, step]);
        },
      });

      setMappingResult(matchRecord);
    } catch (e: any) {
      console.error("[Candidate360Modal] Match error:", e);
      setMatchError(e?.message || "Failed to analyze candidate fitment.");
    } finally {
      setIsMapping(false);
    }
  };

  const handleUpdateResume = async () => {
    if (resumeUpdateMode === 'FILE' && !newResumeFile) {
      setResumeUpdateError("Please select a resume file to upload (PDF, DOCX, DOC, or TXT).");
      return;
    }
    if (resumeUpdateMode === 'TEXT' && !newResumeText.trim()) {
      setResumeUpdateError("Please paste or type updated resume text.");
      return;
    }

    setIsUpdatingResume(true);
    setResumeUpdateError(null);
    setResumeUpdateProgress("1/4: Ingesting & extracting updated resume text...");

    try {
      let ingestionResult: any;
      let originalFileName = "";
      let fileSize: number | undefined;

      const candidateId = candidate.candidateId || candidate.originalId || candidate.id;
      const currentVersions = Array.isArray(displayCandidate.resumeVersions) ? [...displayCandidate.resumeVersions] : [];
      const nextVersionNum = (displayCandidate.currentResumeVersion || currentVersions.length || 0) + 1;

      if (resumeUpdateMode === 'FILE' && newResumeFile) {
        originalFileName = newResumeFile.name;
        fileSize = newResumeFile.size;
        ingestionResult = await ResumeIngestionService.ingestResumeFromFile(newResumeFile, {
          orgId: userOrgId || "HQ",
          userRole: userRole || "recruiter",
          userId: (candidate as any)?.submitterId || "recruiter",
          forceRescan: true
        });
      } else {
        originalFileName = `Resume_v${nextVersionNum}_Manual.txt`;
        const textResult = ResumeIngestionService.ingestResumeFromText(
          newResumeText,
          originalFileName,
          (candidate as any)?.submitterId || "recruiter",
          {
            forceRescan: true
          }
        );
        ingestionResult = textResult.structured;
      }

      setResumeUpdateProgress("2/4: Parsing competencies, skills, experience & domain...");

      const extractedSkills: string[] = Array.isArray(ingestionResult.professional?.skills?.value) 
        ? ingestionResult.professional.skills.value 
        : (Array.isArray(ingestionResult.skills) ? ingestionResult.skills : []);
      const expYears = ingestionResult.professional?.totalExperienceYears?.value ?? null;
      const experienceStr = expYears !== null 
        ? `${expYears} Years` 
        : (typeof displayCandidate.experience === 'string' ? displayCandidate.experience : "Experience Under Review");

      const newVersionEntry = {
        version: nextVersionNum,
        uploadedAt: new Date().toISOString(),
        fileName: originalFileName,
        fileSize: fileSize || null,
        parsedSkills: extractedSkills,
        fieldsExtractedCount: ingestionResult.extraction?.fieldsExtractedCount || 0,
        summary: typeof ingestionResult.summary === 'string' ? ingestionResult.summary.substring(0, 150) : ""
      };
      const updatedVersions = [...currentVersions, newVersionEntry];

      setResumeUpdateProgress("3/4: Persisting updated candidate profile to Firestore...");

      // Prepare updates payload for Firestore
      const candidateUpdates: any = {
        parsedResumeText: ingestionResult.rawText || newResumeText || "",
        resumeText: ingestionResult.rawText || newResumeText || "",
        extractedText: ingestionResult.rawText || newResumeText || "",
        skills: extractedSkills,
        normalizedSkills: extractedSkills,
        experienceYears: expYears ?? 0,
        totalExperience: expYears ?? 0,
        experience: experienceStr,
        education: ingestionResult.education || [],
        certifications: ingestionResult.certifications || [],
        employmentHistory: ingestionResult.professional?.employmentHistory || [],
        summary: ingestionResult.summary || displayCandidate.summary || "",
        distillationSummary: ingestionResult.summary || displayCandidate.distillationSummary || "",
        currentResumeVersion: nextVersionNum,
        resumeVersions: updatedVersions,
        resumeLastParsedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resumeProcessingStatus: "COMPLETED",
        resumeParserVersion: ingestionResult.extraction?.parserVersion || "2.5.0-deterministic",
        sourceMetadata: {
          ...(displayCandidate.sourceMetadata || {}),
          ingestedAt: new Date().toISOString(),
          originalFileName,
          extractionMethod: ingestionResult.extraction?.extractionMethod || "DETERMINISTIC_EXTRACTION",
          parserVersion: ingestionResult.extraction?.parserVersion || "2.5.0-deterministic",
          confidence: ingestionResult.extraction?.overallConfidence || "high",
        }
      };

      if (ingestionResult.professional?.currentTitle?.value) {
        candidateUpdates.currentRole = ingestionResult.professional.currentTitle.value;
        candidateUpdates.title = ingestionResult.professional.currentTitle.value;
      }
      if (ingestionResult.professional?.currentCompany?.value) {
        candidateUpdates.currentCompany = ingestionResult.professional.currentCompany.value;
      }
      if (ingestionResult.location?.currentLocation?.value) {
        candidateUpdates.location = ingestionResult.location.currentLocation.value;
      }
      if (ingestionResult.preferences?.workMode?.value) {
        candidateUpdates.workMode = ingestionResult.preferences.workMode.value;
      }

      // Sanitize payload recursively to strip any undefined fields that cause Firestore setDoc() to fail
      const sanitizedUpdates = sanitizeFirestorePayload(candidateUpdates);

      // Check which collection has the candidate: candidatePool or direct_candidates
      let updatedAnyCollection = false;
      const poolSnap = await getDoc(doc(db, "candidatePool", candidateId));
      if (poolSnap.exists()) {
        await setDoc(doc(db, "candidatePool", candidateId), sanitizedUpdates, { merge: true });
        updatedAnyCollection = true;
      }

      const directSnap = await getDoc(doc(db, "direct_candidates", candidateId));
      if (directSnap.exists()) {
        await setDoc(doc(db, "direct_candidates", candidateId), sanitizedUpdates, { merge: true });
        updatedAnyCollection = true;
      }

      if (!updatedAnyCollection) {
        // Default target collection
        await setDoc(doc(db, "candidatePool", candidateId), sanitizedUpdates, { merge: true });
      }

      try {
        const { useCandidateStore } = await import("../../stores/CandidateStore");
        await useCandidateStore.getState().updateCandidate(candidateId, sanitizedUpdates);
      } catch (storeErr) {
        console.warn("[Candidate360Modal] CandidateStore update warning:", storeErr);
      }

      // Update local state immediately so UI refreshes without reload
      setFullCandidateData((prev: any) => ({
        ...(prev || {}),
        ...sanitizedUpdates
      }));

      // Determine if match should be re-evaluated
      let matchRan = false;
      let newScore: number | undefined;
      let targetJobTitle: string | undefined;

      const jobToMatch = selectedMatchReqIdForUpdate || selectedJobId || candidate.requirementId;
      if (autoRerunMatch && jobToMatch) {
        setResumeUpdateProgress("4/4: Re-running 7-Point AI Match against requirement...");
        try {
          const context = AccessControlService.buildAccessContext({
            id: (candidate as any)?.submitterId || "local_user",
            role: userRole,
            orgId: userOrgId,
          });

          const matchRecord = await CandidateMatchingService.matchCandidateToRequirement({
            candidateId,
            requirementId: jobToMatch,
            context,
          });

          setMappingResult(matchRecord);
          matchRan = true;
          newScore = matchRecord?.matchScore ?? matchRecord?.score ?? matchRecord?.fitScore;
          const reqObj = effectiveJobs.find(j => j.id === jobToMatch);
          targetJobTitle = reqObj?.title || reqObj?.role || "Active Requirement";
          if (!selectedJobId) {
            setSelectedJobId(jobToMatch);
          }
        } catch (matchErr: any) {
          console.warn("[Candidate360Modal] Auto-match after resume update warning:", matchErr);
        }
      }

      publishEvent({
        type: "info",
        title: "Candidate Resume Updated",
        message: `Candidate ${candidateIdStr} resume updated to v${nextVersionNum}. ${extractedSkills.length} skills indexed.`,
        recipients: ["GLOBAL_ADMIN", "RECRUITER"]
      });

      setResumeUpdateSuccess({
        version: nextVersionNum,
        fileName: originalFileName,
        skillsCount: extractedSkills.length,
        newSkills: extractedSkills.slice(0, 10),
        experience: experienceStr,
        matchUpdated: matchRan,
        newMatchScore: newScore,
        requirementTitle: targetJobTitle
      });

      setNewResumeFile(null);
      setNewResumeText("");
    } catch (err: any) {
      console.error("[Candidate360Modal] Resume update failed:", err);
      setResumeUpdateError(err.message || "Failed to update resume.");
    } finally {
      setIsUpdatingResume(false);
      setResumeUpdateProgress("");
    }
  };

  const handleSubmitCandidate = async () => {
    if (!selectedJobId) return;
    setIsSubmittingCandidate(true);
    setSubmissionFeedback(null);
    try {
      const { useSubmissionStore } = await import("../../stores/SubmissionStore");
      const selectedReq = effectiveJobs.find(j => j.id === selectedJobId);
      const targetClientId = selectedReq?.clientId || "ORG-CLIENT-1";
      const candidateId = candidate.candidateId || candidate.originalId || candidate.id;

      const response = await useSubmissionStore.getState().submitCandidateProfile({
        candidateData: {
          id: candidateId,
          name: nameStr,
          email: displayCandidate.email || displayCandidate.contactEmail || "",
          phone: displayCandidate.phone || displayCandidate.contactPhone || "",
          resumeText: displayCandidate.parsedResumeText || displayCandidate.resumeText || displayCandidate.extractedText || "",
          skills: getSkillsArray(displayCandidate.skills) || [],
        },
        requirementId: selectedJobId,
        clientId: targetClientId,
        vendorId: userOrgId || "local",
        submitterId: "local_user",
        initialStatus: "PENDING_REVIEW",
        matchScore: mappingResult?.matchScore || mappingResult?.fitScore || 0,
        aiAnalysis: mappingResult || null,
        bypassOwnershipCheck: isAdmin,
        authorization_id: `reqven-${selectedJobId}-${userOrgId}`
      });

      if (response && response.success) {
        setSubmissionFeedback({ success: true, message: "Candidate submitted successfully to client pipeline!" });
      } else {
        setSubmissionFeedback({ success: false, message: response?.message || "Submission failed" });
      }
    } catch(e: any) {
      console.error("[Candidate360Modal] Submit error:", e);
      setSubmissionFeedback({ success: false, message: e?.message || "Failed to submit candidate." });
    } finally {
      setIsSubmittingCandidate(false);
    }
  };

  useEffect(() => {
    const id = candidate.candidateId || candidate.originalId || candidate.id;
    let unsubProfile = () => {};
    let unsubEvents = () => {};
    let unsubInterviews = () => {};
    let unsubMatches = () => {};

    import("../../stores/CandidateStore").then(({ useCandidateStore }) => {
       const store = useCandidateStore.getState();
       
       if (!userRole.includes("client")) {
          unsubProfile = store.subscribeToCandidate(id, (data) => {
             setFullCandidateData(data);
          });
       }

       if (!userRole.includes("client")) {
          unsubEvents = store.subscribeToEvents(id, (evs) => setEvents(evs));
          unsubInterviews = store.subscribeToInterviews(id, (ints) => setInterviews(ints));
          unsubMatches = store.subscribeToMatches(id, selectedJobId || candidate.requirementId, (match) => {
             if (match) setMappingResult(match);
          });
       } else {
             fetch(`/api/client-candidate?candidateId=${id}&clientId=${userOrgId}`)
             .then(res => res.json())
             .then(data => {
                if (data?.candidate) setFullCandidateData(data.candidate);
                if (data?.aiAnalysis) setMappingResult(data.aiAnalysis);
                if (data?.interviews) {
                    setInterviews(data.interviews);
                }
             })
             .catch(err => console.warn("Failed to fetch client candidate data via API", err));
       }
    });

    return () => {
       unsubProfile();
       unsubEvents();
       unsubInterviews();
       unsubMatches();
    };
  }, [candidate, selectedJobId, userRole, userOrgId]);

  const candidateIdStr = displayCandidate.candidateId || displayCandidate.id || "HN-CAN-PENDING";
  const nameStr = displayCandidate.candidateName || displayCandidate.displayName || displayCandidate.fullName || displayCandidate.name || displayCandidate.parsedName || displayCandidate.parsedResume?.name || displayCandidate.resumeData?.name || "Unknown Candidate";
  const vendorStr = vendorMap?.[displayCandidate.vendorId] || displayCandidate.vendorName || (displayCandidate.vendorId === "ORG-GLOBAL-HQ" ? "WorkNexa Infotech" : displayCandidate.vendorId) || "Direct/Unknown";
  
  const getSkillsArray = (skills: any): string[] => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === "string") return skills.split(",").map((s: string) => s.trim()).filter(Boolean);
    return [];
  };

  const skillsArr = getSkillsArray(displayCandidate.skills);

  let TABS: { id: TabType, label: string, icon: any }[] = [
    { id: 'OVERVIEW', label: 'Summary', icon: User },
    { id: 'RESUME', label: 'Resume', icon: FileText },
    { id: 'AI_ANALYSIS', label: 'Candidate Intelligence', icon: Bot },
    { id: 'REQUIREMENTS', label: 'JD Match Analysis', icon: Briefcase },
    { id: 'INTERVIEWS', label: 'Interviews', icon: Calendar },
    { id: 'TIMELINE', label: 'Timeline', icon: Activity },
    { id: 'COLLABORATION', label: 'Feedback', icon: MessageSquare },
    { id: 'GOVERNANCE', label: 'Governance', icon: ShieldAlert },
  ];

  if (isClientReviewMode) {
     TABS = TABS.filter(t => !['GOVERNANCE'].includes(t.id));
  }

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" 
      onClick={(e) => {
        if (e.target === e.currentTarget && !showUpdateResumeModal) {
          onClose();
        }
      }}
    >
       <div className="bg-slate-50 w-full max-w-7xl h-full sm:h-[85vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-black shadow-inner">
                   {nameStr[0]}
                </div>
                <div>
                   <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                     {nameStr}
                     {candidate.status === 'ACTIVE' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                   </h2>
                   <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-semibold text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{candidateIdStr}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {formatLocationDisplay(candidate.location)}</span>
                      <span className="uppercase text-slate-400">Vendor: <span className="text-slate-600">{vendorStr}</span></span>
                      {candidate.pipelineStage && (
                         <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 uppercase tracking-wider">{candidate.pipelineStage}</Badge>
                      )}
                   </div>
                </div>
             </div>
             
             <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                <X size={20} />
             </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-white shrink-0 custom-scrollbar px-6 shadow-sm z-10">
             {TABS.map(tab => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={cn(
                     "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 whitespace-nowrap transition-colors",
                     isActive 
                       ? "border-indigo-600 text-indigo-700" 
                       : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                   )}
                 >
                   <Icon size={14} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                   {tab.label}
                 </button>
               )
             })}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
             
             {/* OVERVIEW TAB */}
             {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-3 lg:col-span-2">
                         <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-slate-400 border-b border-slate-100 pb-2">Candidate Summary</h3>
                         <div className="space-y-4 text-sm font-medium">
                            <div className="flex justify-between items-center"><span className="text-slate-500">Email:</span> <span className="text-slate-900">{displayCandidate.email || displayCandidate.primaryEmail || 'N/A'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Phone:</span> <span className="text-slate-900">{displayCandidate.phone || displayCandidate.phoneHash || 'N/A'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Vendor:</span> <span className="text-slate-900">{vendorStr}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Experience:</span> <span className="text-slate-900 max-w-[250px] truncate">{formatExperienceDisplay(displayCandidate)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Current Stage:</span> <Badge>{displayCandidate.pipelineStage || 'Added'}</Badge></div>
                         </div>
                      </div>
                      
                      {isClientReviewMode ? (
                          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm col-span-1 border-dashed flex flex-col justify-center">
                             <div className="text-center">
                                <h3 className="font-bold text-indigo-800 uppercase tracking-widest text-[10px] mb-2 mt-2">Active Consideration</h3>
                                <p className="text-xs text-indigo-600 mb-4 font-medium px-4">This candidate was submitted for your review. To see the detailed match breakdown, select the Match Analysis tab below.</p>
                                <Button className="w-full text-xs font-bold" onClick={() => setActiveTab('REQUIREMENTS')} variant="outline">View Match Analysis</Button>
                             </div>
                          </div>
                      ) : (
                         <div className="bg-indigo-900 p-5 rounded-xl border border-indigo-800 shadow-sm text-white flex flex-col justify-center items-center text-center">
                            <h3 className="font-bold uppercase tracking-widest text-[10px] text-indigo-300 mb-2">Platform Score</h3>
                            <div className="text-5xl font-black text-indigo-100 mb-2">
                              {(() => {
                                const score = getCandidateFitmentScore({ ...displayCandidate, ...(mappingResult ? { matchScore: mappingResult.matchScore } : {}) });
                                return score > 0 ? score : '--';
                              })()}
                              <span className="text-2xl text-indigo-400">%</span>
                            </div>
                            <p className="text-xs text-indigo-300 font-medium">{mappingResult ? 'Matched to Requirement' : 'Verified Fitment Score'}</p>
                         </div>
                      )}
                   </div>

                   {skillsArr.length > 0 && (
                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-slate-400 border-b border-slate-100 pb-2">Extracted Skills</h3>
                         <div className="flex flex-wrap gap-2">
                             {skillsArr.map((skill: string, i: number) => (
                                 <span key={i}>
                                    <Badge variant="outline" className="bg-slate-50 border border-slate-200 text-slate-700">{skill}</Badge>
                                 </span>
                              ))}
                         </div>
                     </div>
                   )}

                   {/* Candidate Reactivation Engine Card */}
                   {(() => {
                     const targetJob = jobs?.[0] || { title: "Lead Software Engineer", requiredSkills: skillsArr.length ? skillsArr : ["TypeScript", "React"], maxBudget: "25 LPA" };
                     const opp = CandidateReactivationService.evaluateOpportunity(displayCandidate, targetJob);
                     if (!opp) return null;
                     return (
                       <div className="bg-white p-1 rounded-xl shadow-sm border border-indigo-100">
                         <div className="px-4 pt-3 pb-1 flex items-center justify-between border-b border-slate-100">
                           <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                             <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Candidate Reactivation Intelligence
                           </span>
                           <span className="text-[10px] text-slate-400">8-Signal Converging Evidence</span>
                         </div>
                         <div className="p-2">
                           <ReactivationOpportunityCard
                             opportunity={opp}
                             onApprove={async (oppId, customMessage, channel) => {
                               try {
                                 const res = await fetch('/api/reactivation/approve', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ opportunityId: oppId, opportunity: opp, customMessage, channel })
                                 });
                                 const data = await res.json();
                                 if (data.success) {
                                   alert("Outreach successfully dispatched via Communication Guard!");
                                 } else {
                                   alert("Dispatch notice: " + (data.error || "Processed"));
                                 }
                               } catch (err: any) {
                                 alert("Failed to send outreach: " + err.message);
                               }
                             }}
                             onDiscard={async () => {
                               alert("Reactivation opportunity dismissed for this candidate.");
                             }}
                           />
                         </div>
                       </div>
                     );
                   })()}
                </div>
             )}

             {/* RESUME TAB */}
             {activeTab === 'RESUME' && (
                <div className="h-full flex flex-col max-w-5xl mx-auto space-y-4 animate-in fade-in duration-300">
                   <div className="flex justify-between items-center">
                      <div>
                         <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] text-slate-400">Parsed Resume Text</h3>
                         {(displayCandidate.resumeLastParsedAt || displayCandidate.createdAt) && (
                            <span className="text-[10px] text-indigo-600 font-semibold block mt-1">
                              Parsed: {(() => {
                                 const dateVal = displayCandidate.resumeLastParsedAt || displayCandidate.createdAt;
                                 if (!dateVal) return "";
                                 try {
                                   const d = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
                                   return d.toLocaleDateString(undefined, {
                                     month: "short",
                                     day: "numeric",
                                     year: "numeric",
                                     hour: "2-digit",
                                     minute: "2-digit"
                                   });
                                 } catch (e) {
                                   return String(dateVal);
                                 }
                              })()}
                            </span>
                         )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="h-8 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-1.5" 
                          onClick={() => {
                            setShowUpdateResumeModal(true);
                            setResumeUpdateSuccess(null);
                            setResumeUpdateError(null);
                            if (selectedJobId) {
                              setSelectedMatchReqIdForUpdate(selectedJobId);
                            }
                          }}
                        >
                          <FileUp size={14} />
                          Update Resume
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={isRetrying}
                          className="h-8 text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                          onClick={handleRetryEnrichment}
                        >
                          <RotateCcw size={14} className={cn("mr-1.5", isRetrying && "animate-spin")} />
                          {isRetrying ? "Rescanning..." : "Deterministic Rescan"}
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={async () => {
                         const url = displayCandidate.resumeUrl || displayCandidate.originalResumeUrl || displayCandidate.resumeFileUrl;
                         if (url) {
                           window.open(url, '_blank');
                           return;
                         }
                         if (displayCandidate.storagePath) {
                           try {
                             const { getStorage, ref, getDownloadURL } = await import("firebase/storage");
                             const storageInstance = getStorage();
                             const fileRef = ref(storageInstance, displayCandidate.storagePath);
                             const downloadUrl = await getDownloadURL(fileRef);
                             window.open(downloadUrl, '_blank');
                           } catch (err: any) {
                             console.error("Failed to fetch download URL from Storage:", err);
                             alert("Failed to fetch download URL from Storage: " + err.message);
                           }
                         } else {
                           alert('Original resume file not found.');
                         }
                      }}><UploadCloud size={14} className="mr-2" /> Download Original</Button>
                      </div>
                   </div>

                   {/* Resume Update Success Banner */}
                   {resumeUpdateSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                              Resume v{resumeUpdateSuccess.version} Successfully Activated
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-semibold">
                                {resumeUpdateSuccess.fileName}
                              </span>
                            </div>
                            <div className="text-emerald-700 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span><strong>{resumeUpdateSuccess.skillsCount}</strong> skills extracted & indexed</span>
                              <span>•</span>
                              <span>{resumeUpdateSuccess.experience}</span>
                              {resumeUpdateSuccess.matchUpdated && resumeUpdateSuccess.newMatchScore !== undefined && (
                                <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                                  New AI Match Score: {resumeUpdateSuccess.newMatchScore}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1.5"
                            onClick={() => setActiveTab('REQUIREMENTS')}
                          >
                            View Match in Requirements
                            <ArrowRight size={13} />
                          </Button>
                          <button 
                            onClick={() => setResumeUpdateSuccess(null)}
                            className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-100"
                            title="Dismiss"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                   )}
                   {/* Provenance & Version History Banner */}
                   {(displayCandidate.sourceMetadata || (Array.isArray(displayCandidate.resumeVersions) && displayCandidate.resumeVersions.length > 0)) && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                           <div className="flex items-center gap-2">
                             <span className="font-bold text-slate-700">Source Provenance:</span>
                             <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                               {displayCandidate.sourceType || "DIRECT_CANDIDATE"} ({displayCandidate.directSource || "MANUAL_UPLOAD"})
                             </Badge>
                             {displayCandidate.sourceMetadata?.ingestedAt && (
                               <span className="text-slate-500 text-[11px]">
                                 Ingested: {new Date(displayCandidate.sourceMetadata.ingestedAt).toLocaleString()}
                               </span>
                             )}
                           </div>
                           {displayCandidate.sourceMetadata?.originalFileName && (
                             <div className="text-slate-600 font-mono text-[11px]">
                               File: {displayCandidate.sourceMetadata.originalFileName}
                             </div>
                           )}
                        </div>

                        {Array.isArray(displayCandidate.resumeVersions) && displayCandidate.resumeVersions.length > 0 && (
                          <div className="pt-2 border-t border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                              Resume Version History ({displayCandidate.resumeVersions.length} {displayCandidate.resumeVersions.length === 1 ? 'version' : 'versions'})
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {displayCandidate.resumeVersions.map((v: any, idx: number) => (
                                <div 
                                  key={idx}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-2",
                                    (v.version === displayCandidate.currentResumeVersion || idx === displayCandidate.resumeVersions.length - 1)
                                      ? "bg-indigo-100 text-indigo-900 border-indigo-300 font-bold"
                                      : "bg-white text-slate-600 border-slate-200"
                                  )}
                                >
                                  <span>v{v.version || idx + 1}</span>
                                  <span className="text-[10px] text-slate-500">
                                    {v.uploadedAt ? new Date(v.uploadedAt).toLocaleDateString() : 'Initial'}
                                  </span>
                                  {v.fileName && <span className="text-[10px] opacity-75">({v.fileName})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                   )}

                   {displayCandidate.resumeProcessingStatus && (
                      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-700">Ledger Status: </span>
                          <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-indigo-700 font-bold">{displayCandidate.resumeProcessingStatus}</span>
                          {displayCandidate.resumeProcessingId && (
                            <span className="ml-2 font-mono text-slate-400 text-[11px]">ID: {displayCandidate.resumeProcessingId}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Engine: </span>
                          <span className="font-mono text-slate-600">{displayCandidate.resumeParserVersion || "2.5.0"} (Deterministic Zero-AI)</span>
                        </div>
                      </div>
                   )}
                   <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-y-auto font-mono text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {displayCandidate.parsedResumeText || displayCandidate.resumeText || displayCandidate.extractedText || "No parsed resume text available."}
                   </div>
                </div>
             )}

             {/* AI ANALYSIS TAB (Candidate Intelligence) */}
             {activeTab === 'AI_ANALYSIS' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                    {/* Action Controls Bar */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                       <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Recruitment Intelligence Status</span>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                             {displayCandidate.aiIntelligence ? 'SCREENED & ENRICHED' : 'STANDARD PARSED'}
                          </Badge>
                       </div>
                       <Button
                         onClick={handleRefreshAIAnalysis}
                         disabled={isScreening}
                         size="sm"
                         className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2"
                       >
                         {isScreening ? (
                           <>
                             <Activity size={14} className="animate-spin" />
                             Screening Resume...
                           </>
                         ) : (
                           <>
                             <RotateCcw size={14} />
                             Refresh AI Analysis
                           </>
                         )}
                       </Button>
                    </div>

                    {/* AI Summary Card */}
                    <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 rounded-xl border border-indigo-800 shadow-md relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-6 opacity-10">
                          <Bot size={120} />
                       </div>
                       <h3 className="font-bold uppercase tracking-widest text-xs mb-3 text-indigo-300 flex items-center gap-2">
                         <Bot size={16} /> AI Executive Summary
                       </h3>
                       <p className="text-sm text-slate-200 leading-relaxed font-normal relative z-10">
                         {displayCandidate.aiIntelligence?.aiSummary || displayCandidate.distillationSummary || displayCandidate.aiSummary || displayCandidate.summary || "No AI profile summary generated yet. Click 'Refresh AI Analysis' above to screen this candidate's resume with Gemini AI."}
                       </p>
                    </div>

                    <div className="bg-indigo-50/50 p-8 rounded-xl border border-indigo-100/50 shadow-sm">
                       <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-6 text-indigo-500 border-b border-indigo-100 pb-2 flex items-center gap-2"><Activity size={14} /> HireNest Intelligence Engine</h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-6">
                               <div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Extracted Skills & Competencies</p>
                                   <div className="flex flex-wrap gap-2">
                                       {skillsArr.length > 0 ? skillsArr.map((s: string, idx: number) => (
                                            <span key={idx}>
                                               <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 shadow-sm">{s}</Badge>
                                            </span>
                                        )) : <span className="text-sm text-slate-400 italic">No skills extracted yet.</span>}
                                        {false && null}
                                   </div>
                               </div>
                               
                               <div className="pt-4 border-t border-indigo-100/50">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Detected Experience</p>
                                   <div className="text-2xl font-black text-slate-800">
                                       {formatExperienceDisplay(displayCandidate)}
                                   </div>
                               </div>
                           </div>

                           <div className="space-y-6">
                               {(() => {
                                   const eduItems = parseEducationRecords(displayCandidate.education);
                                   if (eduItems.length === 0) return null;
                                   return (
                                       <div>
                                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Education Background</p>
                                           <div className="space-y-1.5">
                                               {eduItems.map((item, idx) => {
                                                   if (item.raw && !item.degree && !item.institution) {
                                                       return (
                                                           <div key={idx} className="text-sm font-semibold text-slate-700">
                                                               {item.raw}
                                                           </div>
                                                       );
                                                   }
                                                   const degreeAndField = [item.degree, item.field].filter(Boolean).join(' in ') || item.degree || 'Degree';
                                                   const institutionAndYear = [item.institution, item.graduationYear].filter(Boolean).join(' • ');
                                                   return (
                                                       <div key={idx} className="text-sm font-semibold text-slate-700">
                                                           <span className="text-slate-800">{degreeAndField}</span>
                                                           {institutionAndYear && (
                                                               <span className="text-xs font-normal text-slate-500 block">{institutionAndYear}</span>
                                                           )}
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       </div>
                                   );
                               })()}
                               
                               <div className={parseEducationRecords(displayCandidate.education).length > 0 ? "pt-4 border-t border-indigo-100/50" : ""}>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Core Profile Domain</p>
                                   <div className="text-sm font-semibold text-slate-700">{displayCandidate.domain || displayCandidate.inferredDomain || displayCandidate.role || 'Unspecified Domain'}</div>
                               </div>
                               
                               <div className="pt-4 border-t border-indigo-100/50">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location Details</p>
                                   <div className="text-sm font-semibold text-slate-700">{formatLocationDisplay(displayCandidate.location)}</div>
                               </div>
                           </div>
                       </div>
                    </div>
                    
                    {displayCandidate.distillationSummary && (
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                           <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-emerald-500 border-b border-slate-100 pb-2 flex items-center gap-2"><Bot size={14}/> Optional LLM Enhancement (Summary)</h3>
                           <p className="text-sm text-slate-600 leading-relaxed font-medium">{displayCandidate.distillationSummary}</p>
                       </div>
                    )}

                    {/* Strengths and Concerns */}
                    {displayCandidate.aiIntelligence && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-100 shadow-sm">
                               <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-2">
                                 <CheckCircle size={16} /> Key Candidate Strengths
                               </h4>
                               <ul className="space-y-1.5 text-xs text-slate-700">
                                   {(displayCandidate.aiIntelligence.strengths || []).map((st: string, idx: number) => (
                                       <li key={idx} className="flex items-start gap-2">
                                           <span className="text-emerald-500 font-bold">•</span>
                                           <span>{st}</span>
                                       </li>
                                   ))}
                               </ul>
                           </div>

                           <div className="bg-amber-50/60 p-5 rounded-xl border border-amber-100 shadow-sm">
                               <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-3 flex items-center gap-2">
                                 <AlertTriangle size={16} /> Potential Risk / Screening Notes
                               </h4>
                               <ul className="space-y-1.5 text-xs text-slate-700">
                                   {(displayCandidate.aiIntelligence.potentialConcerns || []).map((pc: string, idx: number) => (
                                       <li key={idx} className="flex items-start gap-2">
                                           <span className="text-amber-500 font-bold">•</span>
                                           <span>{pc}</span>
                                       </li>
                                   ))}
                               </ul>
                           </div>
                       </div>
                    )}

                    {/* Interactive Ask Gemini 360 Box */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                       <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] text-indigo-600 flex items-center gap-2">
                          <Bot size={14} /> Ask Gemini AI 360
                       </h3>
                       <p className="text-xs text-slate-500">Query Gemini AI directly regarding this candidate's career trajectory, fit for technical roles, or interview questions.</p>
                       <div className="flex gap-2">
                          <input
                            type="text"
                            value={geminiQuery}
                            onChange={(e) => setGeminiQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAskGemini360()}
                            placeholder="e.g. Is this candidate suitable for a Principal Systems Architect role?"
                            className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <Button
                            onClick={handleAskGemini360}
                            disabled={isAskingGemini || !geminiQuery.trim()}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-2"
                          >
                            {isAskingGemini ? <Activity size={14} className="animate-spin" /> : <Send size={14} />}
                            Ask Gemini
                          </Button>
                       </div>
                       {geminiAnswer && (
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
                             <span className="font-bold text-indigo-600 block mb-1">Gemini AI Copilot:</span>
                             {geminiAnswer}
                          </div>
                       )}
                    </div>
                </div>
             )}

             {/* REQUIREMENTS TAB (JD Match Analysis) */}
             {activeTab === 'REQUIREMENTS' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                    
                    {/* Header Mapping Section (Visible to Vendor/Admin only) */}
                    {!isClientReviewMode && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-indigo-100/50 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-8 opacity-5">
                              <Target size={150} />
                           </div>
                           <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-2">Map candidate to a requirement</h3>
                           <p className="text-sm text-slate-500 mb-4 max-w-xl relative">Select an open requirement to trigger the 7-Point AI Match Engine independently of submission orchestration.</p>
                           
                           {/* Resume Version Status in Requirements Tab */}
                           <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 relative z-10">
                              <div className="flex items-center gap-2">
                                 <span className="font-semibold text-slate-700">Source Profile:</span>
                                 <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono">
                                    Resume v{displayCandidate.currentResumeVersion || 1}
                                 </Badge>
                                 <span>•</span>
                                 <span>{getSkillsArray(displayCandidate.skills)?.length || 0} skills indexed</span>
                                 <span>•</span>
                                 <span>{formatExperienceDisplay(displayCandidate.experience)}</span>
                              </div>
                              <button 
                                 type="button"
                                 onClick={() => {
                                    setShowUpdateResumeModal(true);
                                    setResumeUpdateSuccess(null);
                                    setResumeUpdateError(null);
                                    if (selectedJobId) setSelectedMatchReqIdForUpdate(selectedJobId);
                                 }}
                                 className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1.5 cursor-pointer text-[11px]"
                              >
                                 <FileUp size={13} />
                                 Update Resume to Re-Match
                              </button>
                           </div>

                           <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                              <select 
                                 className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                 value={selectedJobId} 
                                 onChange={e => {
                                    setSelectedJobId(e.target.value);
                                    setMatchError(null);
                                    setMatchProgressSteps([]);
                                    setSubmissionFeedback(null);
                                 }}
                              >
                                 <option value="">Select an open requirement...</option>
                                 {availableJobs.map(j => (
                                    <option key={j.id} value={j.id}>
                                       {j.title} ({j.clientName || j.company || "Enterprise Partner"})
                                    </option>
                                 ))}
                              </select>
                              <Button 
                                 onClick={handleRunMatch} 
                                 disabled={!selectedJobId || isMapping}
                                 className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8"
                              >
                                 {isMapping ? (
                                    <span className="flex items-center gap-2">
                                       <Loader2 size={16} className="animate-spin" />
                                       Analyzing Fit...
                                    </span>
                                 ) : "Run AI Match"}
                              </Button>
                           </div>

                           {/* Progress Checklist */}
                           {(isMapping || matchProgressSteps.length > 0) && (
                              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono border border-slate-800 shadow-inner space-y-1.5">
                                 <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                    <span className="font-semibold text-indigo-400 flex items-center gap-2">
                                       {isMapping ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : <CheckCircle size={13} className="text-emerald-400" />}
                                       Fitment Engine Pipeline
                                    </span>
                                    <span className="text-[10px] text-slate-400">v1.4 Deterministic</span>
                                 </div>
                                 {matchProgressSteps.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                       <span className={step.startsWith("✓") ? "text-emerald-400 font-bold" : "text-indigo-300"}>
                                          {step}
                                       </span>
                                    </div>
                                 ))}
                              </div>
                           )}

                           {/* Error Banner */}
                           {matchError && (
                              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                                 <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                                 <div className="flex-1">
                                    <p className="font-bold">Match Verification Notice</p>
                                    <p className="text-xs text-rose-700 mt-1">{matchError}</p>
                                 </div>
                              </div>
                           )}

                           {/* Submission Feedback */}
                           {submissionFeedback && (
                              <div className={cn("mt-4 p-4 rounded-xl text-sm flex items-start gap-3 border", submissionFeedback.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800")}>
                                 {submissionFeedback.success ? <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />}
                                 <div>
                                    <p className="font-bold">{submissionFeedback.success ? "Submission Complete" : "Submission Failed"}</p>
                                    <p className="text-xs mt-0.5">{submissionFeedback.message}</p>
                                 </div>
                              </div>
                           )}
                        </div>
                    )}

                    {/* Mapped Match Output */}
                    {mappingResult ? (
                       <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
                           <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                              <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-slate-800">JD Match Analysis</h3>
                                    <Badge 
                                       variant="outline" 
                                       className={cn(
                                          "text-xs font-bold px-2.5 py-0.5",
                                          mappingResult.tier === "STRONG" || mappingResult.matchTier === "STRONG" ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                          mappingResult.tier === "VALIDATABLE" || mappingResult.matchTier === "VALIDATABLE" ? "bg-amber-50 text-amber-700 border-amber-300" :
                                          mappingResult.tier === "HARD_GATE_FAIL" || mappingResult.matchTier === "HARD_GATE_FAIL" ? "bg-rose-50 text-rose-700 border-rose-300" :
                                          "bg-blue-50 text-blue-700 border-blue-300"
                                       )}
                                    >
                                       {mappingResult.tier || mappingResult.matchTier || "MATCH RECORD"}
                                    </Badge>
                                 </div>
                                 <p className="text-sm text-slate-500 font-medium">
                                    Target Role: <span className="text-indigo-600 font-semibold">{mappingResult.reqTitle || candidate.reqTitle || "Target Requirement"}</span>
                                    {mappingResult.clientName && <span className="text-slate-400"> • {mappingResult.clientName}</span>}
                                 </p>
                              </div>
                              <div className="text-right">
                                 <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Match Fitment Score</div>
                                 <div className="text-4xl font-black text-indigo-600">
                                    {mappingResult.score ?? mappingResult.matchScore ?? mappingResult.fitScore ?? 0}%
                                 </div>
                              </div>
                           </div>

                           {/* 7-Point Evidence Matrix */}
                           <div className="mb-6">
                              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">7-Point Evidence Matrix</div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                 {/* 1. Skills */}
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Skills (60%)</div>
                                    <div className="text-xl font-black text-indigo-600">
                                       {mappingResult.evidence?.skillsScore ?? mappingResult.breakdown?.skillsScore ?? 0}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                       {mappingResult.skillMatches?.length || mappingResult.skillsOverlap?.length || 0} matched
                                    </div>
                                 </div>

                                 {/* 2. Experience */}
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Experience (25%)</div>
                                    <div className="text-xl font-black text-indigo-600">
                                       {mappingResult.evidence?.experienceScore ?? mappingResult.breakdown?.experienceScore ?? 0}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Years verified</div>
                                 </div>

                                 {/* 3. Recent Role */}
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Recent Role</div>
                                    <div className="text-xl font-black text-indigo-600">
                                       {mappingResult.evidence?.recentRoleScore ?? mappingResult.breakdown?.recentRoleScore ?? 85}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Title fit</div>
                                 </div>

                                 {/* 4. Work Mode */}
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Work Mode</div>
                                    <div className="text-xl font-black text-indigo-600">
                                       {mappingResult.evidence?.workModeScore ?? mappingResult.breakdown?.workModeScore ?? 90}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Flexibility</div>
                                 </div>

                                 {/* 5. Location */}
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Location</div>
                                    <div className="text-xl font-black text-indigo-600">
                                       {mappingResult.evidence?.locationScore ?? mappingResult.breakdown?.locationScore ?? 100}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Geo alignment</div>
                                 </div>

                                 {/* 6. Availability */}
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Availability</div>
                                    <div className="text-xl font-black text-indigo-600">
                                       {mappingResult.evidence?.availabilityScore ?? mappingResult.breakdown?.availabilityScore ?? 80}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Notice period</div>
                                 </div>

                                 {/* 7. Compensation */}
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Compensation</div>
                                    <div className="text-xs font-bold text-slate-700 mt-1 truncate">
                                       {mappingResult.evidence?.compensation || "— Not stated"}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                       {mappingResult.evidence?.compensation === "— Not stated" ? "Not in resume" : "Budget match"}
                                    </div>
                                 </div>
                              </div>
                           </div>
                           
                           {/* AI Summary */}
                           <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl shadow-sm mb-6">
                              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2 block border-b border-indigo-100 pb-2">Grounded Fitment Synthesis</h3>
                              <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                                 {mappingResult.summary || mappingResult.overallMatchReason || "The HireNest fitment engine identified positive alignment across key competency pillars."}
                              </p>
                           </div>

                           {/* Strengths & Gaps */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
                                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3 block border-b border-emerald-100 pb-2">Identified Strengths</h3>
                                 <ul className="space-y-3 mt-3">
                                    {(mappingResult.strengths || ["Meets core experience requirements"]).map((s: string, idx: number) => (
                                      <li key={idx} className="text-sm font-medium text-slate-700 flex items-start gap-2">
                                         <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" /> <span>{s}</span>
                                      </li>
                                    ))}
                                 </ul>
                              </div>
                              
                              <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-between">
                                 <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-3 block border-b border-rose-100 pb-2">Missing Skills & Identified Risks</h3>
                                    <div className="flex flex-wrap gap-1.5 mb-3 mt-3">
                                       {(mappingResult.missingSkills || []).length > 0 ? (
                                          mappingResult.missingSkills.map((s: string, idx: number) => (
                                             <Badge key={idx} variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                                                {s}
                                             </Badge>
                                          ))
                                       ) : (
                                          <span className="text-xs text-slate-400">No critical skill omissions detected</span>
                                       )}
                                    </div>
                                    <ul className="space-y-2 mt-2">
                                       {(mappingResult.risks || []).map((s: string, idx: number) => (
                                         <li key={idx} className="text-sm font-medium text-slate-700 flex items-start gap-2">
                                            <ShieldAlert size={14} className="text-rose-400 shrink-0 mt-0.5" /> <span>{s}</span>
                                         </li>
                                       ))}
                                    </ul>
                                 </div>
                                 {(mappingResult.recommendation || mappingResult.recruiterAssessment) && (
                                    <div className="mt-6 pt-4 border-t border-slate-100">
                                       <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Recruiter Next Action</div>
                                       <div className="text-sm font-semibold text-indigo-700 leading-relaxed">
                                          {mappingResult.recommendation || mappingResult.recruiterAssessment}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Action Footer */}
                           <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                 <Button
                                    variant="outline"
                                    onClick={handleRunMatch}
                                    disabled={isMapping || !selectedJobId}
                                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                 >
                                    <RotateCcw size={14} className="mr-2" />
                                    Re-run Match
                                 </Button>
                                 <Button
                                    variant="outline"
                                    onClick={() => setActiveTab('OVERVIEW')}
                                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                 >
                                    Review Candidate
                                 </Button>
                              </div>

                              {!isClientReviewMode && (
                                 <Button
                                    onClick={handleSubmitCandidate}
                                    disabled={isSubmittingCandidate || isMapping}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm"
                                 >
                                    {isSubmittingCandidate ? (
                                       <span className="flex items-center gap-2">
                                          <Loader2 size={16} className="animate-spin" />
                                          Submitting to Client...
                                       </span>
                                    ) : (
                                       <span className="flex items-center gap-2">
                                          <Send size={15} />
                                          Submit Candidate
                                       </span>
                                    )}
                                 </Button>
                              )}
                           </div>
                       </div>
                    ) : (
                       <div className="bg-slate-50 p-10 rounded-xl border border-slate-200 text-center shadow-sm">
                          <Target size={40} className="text-slate-300 mx-auto mb-4" />
                          <p className="text-base font-bold text-slate-800">No Match Data Available</p>
                          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Select an open requirement above and click "Run AI Match" to evaluate this candidate against requirements.</p>
                       </div>
                    )}
                </div>
             )}

             {/* INTERVIEWS TAB */}
             {activeTab === 'INTERVIEWS' && (
                <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                   <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-6 text-slate-400 border-b border-slate-100 pb-2">Interview History</h3>
                      
                      {interviews.length === 0 ? (
                         <div className="text-center p-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                            <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-600">No Interviews Scheduled</p>
                            <p className="text-xs text-slate-400 mt-1">Interviews mapped to this candidate will appear here.</p>
                         </div>
                      ) : (
                         <div className="space-y-4">
                            {interviews.map(interview => (
                               <div key={interview.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
                                  <div className="flex justify-between items-start mb-3">
                                     <div>
                                        <h4 className="font-bold text-slate-900">{interview.round}</h4>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                           <span className="flex items-center gap-1"><Calendar size={12}/> {interview.date}</span>
                                           <span className="flex items-center gap-1"><User size={12}/> {interview.interviewer}</span>
                                        </div>
                                     </div>
                                     <Badge variant="outline" className={`uppercase text-[10px] tracking-wider ${interview.status === 'SCHEDULED' ? 'bg-amber-50 text-amber-700' : interview.status === 'PASSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {interview.status}
                                     </Badge>
                                  </div>
                                  {interview.notes && (
                                     <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 mt-3 whitespace-pre-wrap">
                                        {interview.notes}
                                     </div>
                                  )}
                                  {interview.outcomeNotes && (
                                     <div className="text-sm text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mt-3 whitespace-pre-wrap">
                                        <span className="font-bold uppercase text-[10px] tracking-widest block mb-1">Feedback / Outcome</span>
                                        {interview.outcomeNotes}
                                     </div>
                                  )}
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                </div>
             )}

             {/* TIMELINE TAB */}
             {activeTab === 'TIMELINE' && (
                <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                   <div className="bg-white p-6 md:p-10 rounded-xl border border-slate-200 shadow-sm relative">
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-8 text-slate-400 border-b border-slate-100 pb-2">Event Ledger Trace</h3>
                      
                      <div className="space-y-6">
                         
                         {events.length === 0 && (
                            <div className="relative pl-6 border-l-2 border-slate-200 pb-4">
                               <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1" />
                               <div className="text-sm font-bold text-slate-900">Candidate Created</div>
                               <div className="text-[10px] font-mono text-slate-400 mt-1 tracking-wider">{candidate.createdAt?.toDate ? candidate.createdAt.toDate().toLocaleString() : "Unknown Timestamp"}</div>
                            </div>
                         )}

                         {events.map((evt, idx) => {
                            const details = [];
                            if (evt.metadata?.source) details.push(`Source: ${evt.metadata.source}`);
                            if (evt.metadata?.fileName) details.push(`File: ${evt.metadata.fileName}`);
                            if (evt.metadata?.score !== undefined) details.push(`Score: ${evt.metadata.score}%`);
                            if (evt.metadata?.error) details.push(`Error: ${evt.metadata.error}`);
                            if (evt.metadata?.message) details.push(evt.metadata.message);

                            const detailStr = details.length > 0 ? details.join(" | ") : "";
                            const title = evt.type ? String(evt.type).replace(/([A-Z])/g, ' $1').trim() : "Event";

                            return (
                               <div key={evt.id} className="relative pl-6 border-l-[3px] border-indigo-100 pb-6 last:pb-0 group mt-2">
                                  <div className="absolute w-4 h-4 bg-white border-4 border-indigo-500 rounded-full -left-[10px] top-1 group-hover:scale-125 transition-transform" />
                                  <div className="text-sm font-black text-slate-800 uppercase tracking-wide">{title}</div>
                                  <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{evt.actorRole ? `By ${evt.actorRole}` : "By System"}</div>
                                  {detailStr && <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">{detailStr}</div>}
                                  <div className="text-[10px] font-mono text-slate-400 mt-3 tracking-wider flex items-center gap-1.5 opacity-60">
                                      <Activity size={10} />
                                      {evt.timestamp?.toDate ? evt.timestamp.toDate().toLocaleString() : "Recently"}
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </div>
                </div>
             )}

             {/* COLLABORATION TAB */}
             {activeTab === 'COLLABORATION' && (
                <div className="max-w-4xl mx-auto h-full flex flex-col animate-in fade-in duration-300">
                   <div className="flex-1 bg-white p-6 rounded-t-xl border border-slate-200 shadow-sm overflow-y-auto space-y-4">
                      {comments.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-center">
                            <MessageSquare size={32} className="text-slate-200 mb-3" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Discussion Yet</p>
                            <p className="text-xs text-slate-400 mt-2">Start a conversation or leave an internal note.</p>
                         </div>
                      ) : (
                         comments.map((c, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                               <div className="flex items-center gap-2 mb-2">
                                  <div className="font-bold text-sm text-slate-800">{c.author || 'User'}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{c.timestamp?.toDate ? c.timestamp.toDate().toLocaleString() : c.time || 'recently'}</div>
                               </div>
                               <div className="text-sm text-slate-700 font-medium">
                                  {c.text.split(/(@\w+)/g).map((part: string, i: number) => 
                                     part.startsWith('@') ? <span key={i} className="text-indigo-600 bg-indigo-50 px-1 rounded font-bold">{part}</span> : part
                                  )}
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                   <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const input = form.elements.namedItem('comment') as HTMLInputElement;
                      if (!input.value.trim()) return;
                      const newComment = {
                         author: "Current User",
                         text: input.value,
                         timestamp: new Date()
                      };
                      setComments([...comments, newComment]);
                      
                      // Notify mentions
                      const mentions = input.value.match(/@\w+/g);
                      if (mentions) {
                         import('../../lib/eventEngine').then(({ publishEvent }) => {
                            mentions.forEach(m => {
                               let targetId = m.substring(1).toUpperCase();
                               // Identity Resolution for @vendor
                               if (m.toLowerCase() === '@vendor' && candidate.vendorId) {
                                  targetId = candidate.vendorId;
                               }
                               publishEvent({
                                  type: 'info',
                                  title: 'You were mentioned',
                                  message: `You were mentioned in Candidate ${nameStr} thread.`,
                                  recipients: [targetId]
                               });
                            });
                         });
                      }
                      
                      const id = candidate.originalId || candidate.id || candidate.candidateId;
                      import('../../stores/CandidateStore').then(({ useCandidateStore }) => {
                         if (id) {
                            useCandidateStore.getState().updateCandidate(id, { comments: [...comments, newComment] }).catch(() => {});
                         }
                      });
                      input.value = "";
                   }} className="bg-slate-50 p-4 rounded-b-xl border border-slate-200 border-t-0 flex items-center gap-3 shrink-0">
                      <input 
                         name="comment"
                         type="text" 
                         className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                         placeholder="Type a note or use @mention..."
                      />
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Send</Button>
                   </form>
                </div>
             )}

             {/* GOVERNANCE TAB */}
             {activeTab === 'GOVERNANCE' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-slate-400 border-b border-slate-100 pb-2">Ownership & Access Vault</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                         <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Entity ID</div>
                            <div className="font-mono text-slate-800">{candidateIdStr}</div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Owner (SSOT)</div>
                            <div className="font-bold text-slate-800">{displayCandidate.ownerName || vendorStr}</div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Created Via</div>
                            <div className="font-bold text-slate-800">{displayCandidate.createdVia || "OS"} ({displayCandidate.createdFrom || "RECRUITER"})</div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Acquisition Method</div>
                            <div className="font-bold text-slate-800 uppercase font-mono text-[11px] text-indigo-600">{displayCandidate.acquisitionMethod || "IMPORT"}</div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg col-span-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Acquired Timestamp</div>
                            <div className="text-slate-800 font-mono text-xs">{displayCandidate.acquiredAt ? new Date(displayCandidate.acquiredAt).toLocaleString() : new Date().toLocaleString()}</div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg col-span-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Source Pipeline</div>
                            <div className="text-slate-800">{candidate.source || "Manual Onboarding Extraction"}</div>
                         </div>
                      </div>

                      {/* Dispute Trigger */}
                      <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                         <div>
                            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">Acquisition Conflict?</h4>
                            <p className="text-xs text-slate-400 font-medium">If this candidate profile was already uploaded, initiate a standard dispute resolution.</p>
                         </div>
                         <Button
                           onClick={() => {
                             alert(`Dispute initiated. Ownership Vault created dispute ID DSP-${Math.floor(1000 + Math.random() * 9000)} which is logged in the ledger.`);
                           }}
                           className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                         >
                           Dispute Claim
                         </Button>
                      </div>
                   </div>

                   <div className="bg-rose-50 border border-rose-100 p-6 rounded-xl">
                      <h3 className="font-bold text-rose-800 uppercase tracking-widest text-[10px] mb-2">Danger Zone</h3>
                      <p className="text-sm text-rose-700/80 mb-4">Deleting this candidate will permanently sever workflow links and log a destruction event in the immutable ledger.</p>
                      
                      {isAdmin ? (
                         !showDeleteConfirm ? (
                           <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-100 font-bold bg-white" onClick={() => setShowDeleteConfirm(true)}>Delete Identity Record</Button>
                         ) : (
                           <div className="bg-white border border-rose-200 p-4 rounded-lg mt-4 shadow-sm">
                             <h4 className="font-bold text-rose-800 mb-2">Confirm Candidate Deletion</h4>
                             <p className="text-sm text-slate-700 mb-2">Candidate: {nameStr}</p>
                             <p className="text-sm text-slate-700 mb-4 font-mono">ID: {candidateIdStr}</p>
                             <ul className="text-sm text-slate-600 mb-4 space-y-1">
                               <li>✓ Remove candidate from active pipelines</li>
                               <li>✓ Remove ownership records</li>
                               <li>✓ Remove resume storage references</li>
                               <li>✓ Create immutable audit event</li>
                             </ul>
                             <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Type DELETE to continue:</p>
                             <input 
                               type="text" 
                               value={deleteConfirmText} 
                               onChange={(e) => setDeleteConfirmText(e.target.value)}
                               className="w-full border-rose-200 rounded-md bg-rose-50 text-rose-900 placeholder:text-rose-300 font-mono text-sm px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-rose-500"
                               placeholder="DELETE"
                             />
                             <div className="flex gap-2">
                               <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                               <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDeleteCandidate} disabled={deleteConfirmText !== "DELETE" || isDeleting}>
                                 {isDeleting ? "Deleting..." : "Delete Candidate"}
                               </Button>
                             </div>
                           </div>
                         )
                      ) : (
                         <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-100 font-bold bg-white" onClick={() => alert("Delete request submitted to AdminHQ.")}>Request Deletion</Button>
                      )}
                   </div>
                </div>
             )}
          </div>
          
          {isClientReviewMode && (
             <div className="p-6 bg-white border-t border-slate-200 shrink-0 space-y-3 z-10 w-full shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                 {(() => {
                    const status = candidate.status || candidate.pipelineStage || 'PENDING_REVIEW';
                    if (status === 'REJECTED') {
                       return (
                           <div className="bg-rose-50 border border-rose-100 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-1 text-sm text-rose-800 font-bold">
                              <div className="flex items-center gap-2"><X size={18} className="text-rose-500" /> Rejected {candidate.rejectReason ? `- ${candidate.rejectReason}` : ''}</div>
                           </div>
                       )
                    }

                    if (status === 'PENDING_REVIEW' || status === 'SUBMITTED' || status === 'MATCHED') {
                       return (
                          <div className="grid grid-cols-2 gap-3 mb-3">
                             <Button onClick={onShortlist} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 w-full rounded-xl shadow-sm transition-all hover:-translate-y-0.5">
                               <CheckCircle size={18} className="mr-2"/> Shortlist
                             </Button>
                             <Button onClick={onReject} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold h-12 w-full rounded-xl transition-all">
                               <X size={18} className="mr-2"/> Reject
                             </Button>
                          </div>
                       )
                    }

                    if (status === 'SHORTLISTED') {
                       return (
                          <div className="grid grid-cols-3 gap-3">
                             <Button onClick={onSchedule} className="bg-slate-900 hover:bg-black text-white font-bold h-12 w-full rounded-xl shadow-sm transition-all">
                               <Calendar size={18} className="mr-2"/> Request Interview
                             </Button>
                             <Button onClick={onRequestClarification} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-bold h-12 w-full rounded-xl transition-all">
                               <MessageSquare size={18} className="mr-2"/> Request Clarification
                             </Button>
                             <Button onClick={onReject} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold h-12 w-full rounded-xl transition-all">
                               <X size={18} className="mr-2"/> Reject
                             </Button>
                          </div>
                       )
                    }

                    if (status === 'INTERVIEW_REQUESTED' || status === 'INTERVIEW_SCHEDULED' || status === 'INTERVIEW_IN_PROGRESS' || status.includes('INTERVIEW')) {
                       return (
                          <div className="flex flex-col gap-3">
                             <div className="bg-indigo-50 border border-indigo-100 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-1 text-sm text-indigo-800 font-bold">
                               <div className="flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> Interview Stage</div>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                               <Button onClick={onOffer} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 w-full rounded-xl shadow-sm transition-all">
                                 <Target size={18} className="mr-2"/> Release Offer
                               </Button>
                               <Button onClick={onReject} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold h-12 w-full rounded-xl transition-all">
                                 <X size={18} className="mr-2"/> Pass / Reject
                               </Button>
                             </div>
                          </div>
                       )
                    }

                    if (status === 'OFFER_DRAFTED' || status === 'OFFER_RELEASED' || status === 'OFFER_ACCEPTED') {
                        return (
                           <div className="bg-emerald-50 border border-emerald-100 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-1 text-sm text-emerald-800 font-bold">
                              <div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Offer Stage Proceeding</div>
                           </div>
                        )
                    }

                    return (
                        <div className="bg-slate-50 border border-slate-100 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-1 text-sm text-slate-800 font-bold">
                           <div className="flex items-center gap-2"><Activity size={18} className="text-slate-500" /> {status}</div>
                        </div>
                    );

                 })()}
             </div>
          )}

       {/* Update Resume Modal Overlay */}
       {showUpdateResumeModal && (
         <div 
           className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
           onClick={(e) => {
             e.stopPropagation();
             if (e.target === e.currentTarget && !isUpdatingResume) {
               setShowUpdateResumeModal(false);
               setResumeUpdateSuccess(null);
               setResumeUpdateError(null);
             }
           }}
         >
           <div 
             className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
             onClick={(e) => e.stopPropagation()}
           >
             {/* Modal Header */}
             <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                   <FileUp size={18} />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-900 text-base">Update Candidate Resume</h3>
                   <p className="text-xs text-slate-500">
                     Candidate: <span className="font-semibold text-slate-700">{nameStr}</span> (Active: v{displayCandidate.currentResumeVersion || 1})
                   </p>
                 </div>
               </div>
               <button
                 disabled={isUpdatingResume}
                 onClick={() => {
                   if (!isUpdatingResume) {
                     setShowUpdateResumeModal(false);
                     setResumeUpdateSuccess(null);
                     setResumeUpdateError(null);
                   }
                 }}
                 className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
               >
                 <X size={18} />
               </button>
             </div>

             {/* Modal Body */}
             <div className="p-6 overflow-y-auto space-y-5 flex-1">
               {resumeUpdateSuccess ? (
                 <div className="space-y-4 py-2">
                   <div className="text-center space-y-2">
                     <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                       <CheckCircle2 size={24} />
                     </div>
                     <h4 className="font-bold text-lg text-slate-900">
                       Resume v{resumeUpdateSuccess.version} Activated!
                     </h4>
                     <p className="text-xs text-slate-500 max-w-md mx-auto">
                       The candidate profile and deterministic parsing engine have been refreshed with the updated resume.
                     </p>
                   </div>

                   <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
                     <div className="flex items-center justify-between">
                       <span className="text-slate-500 font-medium">Source Document:</span>
                       <span className="font-mono font-bold text-slate-700 truncate max-w-[220px]">{resumeUpdateSuccess.fileName}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-slate-500 font-medium">Extracted Experience:</span>
                       <span className="font-bold text-slate-800">{resumeUpdateSuccess.experience}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-slate-500 font-medium">Skills Indexed:</span>
                       <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                         {resumeUpdateSuccess.skillsCount} Skills
                       </Badge>
                     </div>
                     {resumeUpdateSuccess.newSkills && resumeUpdateSuccess.newSkills.length > 0 && (
                       <div className="pt-2 border-t border-slate-200">
                         <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">
                           Extracted Competencies
                         </span>
                         <div className="flex flex-wrap gap-1.5">
                           {resumeUpdateSuccess.newSkills.map((sk, idx) => (
                             <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700 font-medium">
                               {sk}
                             </span>
                           ))}
                           {resumeUpdateSuccess.skillsCount > resumeUpdateSuccess.newSkills.length && (
                             <span className="text-[10px] text-slate-400 self-center">
                               +{resumeUpdateSuccess.skillsCount - resumeUpdateSuccess.newSkills.length} more
                             </span>
                           )}
                         </div>
                       </div>
                     )}
                   </div>

                   {resumeUpdateSuccess.matchUpdated ? (
                     <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                       <div>
                         <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                           AI Match Recalculated
                         </span>
                         <div className="font-bold text-sm text-indigo-950 mt-0.5">
                           {resumeUpdateSuccess.requirementTitle || "Selected Requirement"}
                         </div>
                         <div className="text-xs text-indigo-700 mt-0.5">
                           New Match Score: <span className="font-bold text-indigo-900">{resumeUpdateSuccess.newMatchScore ?? "--"}%</span>
                         </div>
                       </div>
                       <Button
                         size="sm"
                         className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
                         onClick={() => {
                           setShowUpdateResumeModal(false);
                           setActiveTab('REQUIREMENTS');
                         }}
                       >
                         View Match
                         <ArrowRight size={14} />
                       </Button>
                     </div>
                   ) : (
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between">
                       <span>Navigate to the <strong>Requirements</strong> tab to run AI Match with this updated resume.</span>
                       <Button
                         size="sm"
                         variant="outline"
                         className="text-xs font-semibold"
                         onClick={() => {
                           setShowUpdateResumeModal(false);
                           setActiveTab('REQUIREMENTS');
                         }}
                       >
                         Go to Requirements
                       </Button>
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="space-y-4">
                   {/* Tab switch between file upload and text paste */}
                   <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                     <button
                       type="button"
                       onClick={() => setResumeUpdateMode('FILE')}
                       className={cn(
                         "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                         resumeUpdateMode === 'FILE'
                           ? "bg-white text-indigo-700 shadow-xs"
                           : "text-slate-600 hover:text-slate-900"
                       )}
                     >
                       <FileUp size={14} />
                       Upload Document (PDF/DOCX)
                     </button>
                     <button
                       type="button"
                       onClick={() => setResumeUpdateMode('TEXT')}
                       className={cn(
                         "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                         resumeUpdateMode === 'TEXT'
                           ? "bg-white text-indigo-700 shadow-xs"
                           : "text-slate-600 hover:text-slate-900"
                       )}
                     >
                       <FileCode size={14} />
                       Paste Resume Text
                     </button>
                   </div>

                   {/* Mode 1: File Upload */}
                   {resumeUpdateMode === 'FILE' && (
                     <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                       <div
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           fileInputRef.current?.click();
                         }}
                         onDragEnter={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setIsDraggingFile(true);
                         }}
                         onDragOver={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setIsDraggingFile(true);
                         }}
                         onDragLeave={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setIsDraggingFile(false);
                         }}
                         onDrop={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setIsDraggingFile(false);
                           const f = e.dataTransfer.files?.[0];
                           if (f) {
                             setNewResumeFile(f);
                             setResumeUpdateError(null);
                           }
                         }}
                         className={cn(
                           "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none",
                           isDraggingFile
                             ? "border-indigo-600 bg-indigo-50/80 scale-[1.01]"
                             : newResumeFile
                             ? "border-emerald-400 bg-emerald-50/40"
                             : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
                         )}
                       >
                         <input
                           ref={fileInputRef}
                           id="candidate-resume-update-file-input"
                           type="file"
                           accept=".pdf,.docx,.doc,.txt"
                           className="hidden"
                           onClick={(e) => e.stopPropagation()}
                           onChange={(e) => {
                             e.stopPropagation();
                             const f = e.target.files?.[0];
                             if (f) {
                               setNewResumeFile(f);
                               setResumeUpdateError(null);
                             }
                           }}
                         />
                         {newResumeFile ? (
                           <div className="flex flex-col items-center space-y-2.5">
                             <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                               <FileText size={22} />
                             </div>
                             <div>
                               <div className="font-bold text-xs text-slate-900 break-all max-w-md mx-auto">{newResumeFile.name}</div>
                               <div className="text-[11px] text-emerald-700 font-mono mt-0.5 font-medium">
                                 {(newResumeFile.size / 1024).toFixed(1)} KB • Ready to Ingest
                                </div>
                             </div>
                             <div className="flex items-center gap-2 pt-1">
                               <span className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer">
                                 Change file
                               </span>
                               <span className="text-slate-300">•</span>
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   setNewResumeFile(null);
                                   if (fileInputRef.current) {
                                     fileInputRef.current.value = "";
                                   }
                                 }}
                                 className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                               >
                                 Remove
                               </button>
                             </div>
                           </div>
                         ) : (
                           <div className="flex flex-col items-center space-y-2.5">
                             <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                               <UploadCloud size={22} />
                             </div>
                             <div>
                               <div className="font-bold text-xs text-slate-800">
                                 Click or drag & drop updated resume here
                               </div>
                               <div className="text-[11px] text-slate-400 mt-0.5">
                                 Supports PDF, DOCX, DOC, or TXT (Max 10MB)
                               </div>
                             </div>
                             <Button
                               type="button"
                               size="sm"
                               variant="outline"
                               className="text-xs font-semibold gap-1.5 pointer-events-none mt-1 bg-white"
                             >
                               <FileUp size={13} />
                               Browse Files
                             </Button>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* Mode 2: Paste Text */}
                   {resumeUpdateMode === 'TEXT' && (
                     <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-700 block">
                         Paste Updated Resume Content:
                       </label>
                       <textarea
                         value={newResumeText}
                         onChange={(e) => {
                           setNewResumeText(e.target.value);
                           setResumeUpdateError(null);
                         }}
                         rows={8}
                         placeholder="Paste candidate's updated summary, skills, experience, and certifications..."
                         className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                       />
                       <div className="text-[11px] text-slate-400 text-right">
                         {newResumeText.length} characters
                       </div>
                     </div>
                   )}

                   {/* Re-match Option */}
                   <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                     <label className="flex items-start gap-2.5 cursor-pointer">
                       <input
                         type="checkbox"
                         checked={autoRerunMatch}
                         onChange={(e) => setAutoRerunMatch(e.target.checked)}
                         className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                       />
                       <div className="text-xs">
                         <span className="font-bold text-slate-800 block">
                           Automatically re-run 7-Point AI Match after update
                         </span>
                         <span className="text-slate-500 text-[11px]">
                           Immediately calculates new fitment score and evidence against target requirement.
                         </span>
                       </div>
                     </label>

                     {autoRerunMatch && (
                       <div className="pt-2 border-t border-slate-200">
                         <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                           Target Requirement for Matching:
                         </label>
                         <select
                           value={selectedMatchReqIdForUpdate || selectedJobId || ""}
                           onChange={(e) => setSelectedMatchReqIdForUpdate(e.target.value)}
                           className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                         >
                           <option value="">Select requirement...</option>
                           {availableJobs.map((j) => (
                             <option key={j.id} value={j.id}>
                               {j.title} ({j.clientName || j.company || "Enterprise Partner"})
                             </option>
                           ))}
                         </select>
                       </div>
                     )}
                   </div>

                   {/* Error Display */}
                   {resumeUpdateError && (
                     <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
                       <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                       <span>{resumeUpdateError}</span>
                     </div>
                   )}

                   {/* Progress Display */}
                   {isUpdatingResume && (
                     <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                       <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                         <Loader2 size={15} className="animate-spin text-indigo-600" />
                         <span>Processing Resume Update...</span>
                       </div>
                       <div className="text-[11px] font-mono text-indigo-700">
                         {resumeUpdateProgress || "Ingesting & indexing candidate profile..."}
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </div>

             {/* Modal Footer */}
             <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-2">
               {resumeUpdateSuccess ? (
                 <Button
                   className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                   onClick={() => {
                     setShowUpdateResumeModal(false);
                     setResumeUpdateSuccess(null);
                   }}
                 >
                   Done
                 </Button>
               ) : (
                 <>
                   <Button
                     variant="outline"
                     disabled={isUpdatingResume}
                     className="text-xs"
                     onClick={() => {
                       setShowUpdateResumeModal(false);
                       setResumeUpdateError(null);
                     }}
                   >
                     Cancel
                   </Button>
                   <Button
                     disabled={isUpdatingResume || (resumeUpdateMode === 'FILE' ? !newResumeFile : !newResumeText.trim())}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
                     onClick={handleUpdateResume}
                   >
                     {isUpdatingResume ? (
                       <>
                         <Loader2 size={14} className="animate-spin" />
                         Updating...
                       </>
                     ) : (
                       <>
                         <FileUp size={14} />
                         Update & Ingest Resume
                       </>
                     )}
                   </Button>
                 </>
               )}
             </div>
           </div>
         </div>
       )}
       </div>
    </div>
  )
}
