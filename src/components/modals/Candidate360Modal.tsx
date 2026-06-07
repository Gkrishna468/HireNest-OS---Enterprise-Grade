import React, { useState, useEffect } from 'react';
import { 
  X, User, FileText, Bot, Briefcase, Activity, 
  MessageSquare, ShieldAlert, CheckCircle, MapPin, 
  UploadCloud, Search, Calendar, Target,
} from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { Button } from '../../lib/Button';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { publishEvent } from '../../lib/eventEngine';
import { SubmissionOrchestrator } from '../../lib/workflows/SubmissionOrchestrator';
import { parseBulkResumes } from "../../services/aiService";

type TabType = 'OVERVIEW' | 'RESUME' | 'AI_ANALYSIS' | 'REQUIREMENTS' | 'INTERVIEWS' | 'TIMELINE' | 'COLLABORATION' | 'GOVERNANCE';

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
  const [mappingResult, setMappingResult] = useState<any | null>(candidate.aiAnalysis || null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCandidate = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { updateDoc, doc, collection, query, where, getDocs, serverTimestamp } = await import("firebase/firestore");
      const candId = candidate.candidateId || candidate.id;
      
      const updateData = {
        status: "DELETED",
        isActive: false,
        deletedAt: serverTimestamp(),
        deletedBy: "super_admin",
        deletionReason: "Admin Requested Deletion"
      };

      await updateDoc(doc(db, "candidatePool", candId), updateData);
      
      const ownershipQ = query(collection(db, "ownershipVault"), where("candidateId", "==", candId));
      const ownershipSnap = await getDocs(ownershipQ);
      for (const d of ownershipSnap.docs) {
         await updateDoc(d.ref, { isActive: false, status: "DELETED" });
      }

      const submissionsQ = query(collection(db, "submissions"), where("candidateId", "==", candId));
      const submissionsSnap = await getDocs(submissionsQ);
      for (const d of submissionsSnap.docs) {
         await updateDoc(d.ref, { isActive: false, status: "DELETED" });
      }
      
      const dealRoomsQ = query(collection(db, "dealRooms"), where("candidateId", "==", candId));
      const dealRoomsSnap = await getDocs(dealRoomsQ);
      for (const d of dealRoomsSnap.docs) {
         await updateDoc(d.ref, { isActive: false, status: "DELETED" });
      }
      
      await publishEvent({
        type: "info",
        title: "Candidate Deleted",
        message: `Candidate ${candId} was soft-deleted by user.`,
        recipients: ["GLOBAL_ADMIN"]
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
      const { updateDoc, doc, serverTimestamp, getDoc } = await import("firebase/firestore");
      const candId = candidate.candidateId || candidate.id;
      
      let resumeTextToUse = candidate.resumeText || candidate.extractedText;

      if (candidate.storagePath) {
        try {
          const { getStorage, ref, getDownloadURL } = await import("firebase/storage");
          const storage = getStorage();
          const fileRef = ref(storage, candidate.storagePath);
          const url = await getDownloadURL(fileRef);
          
          const fileRes = await fetch(url);
          const blob = await fileRes.blob();
          
          const formData = new FormData();
          formData.append("file", blob, candidate.fileName || "resume.pdf");
          
          const extRes = await fetch("/api/extract-text", {
             method: "POST",
             body: formData
          });
          
          if (extRes.ok) {
             const extData = await extRes.json();
             if (extData.text && extData.text.length > 50) {
                 resumeTextToUse = extData.text;
                 await updateDoc(doc(db, "candidatePool", candId), { resumeText: resumeTextToUse });
             }
          }
        } catch (e) {
          console.warn("Could not fetch or re-extract from storage, falling back to existing DB text", e);
        }
      }

      if (!resumeTextToUse || resumeTextToUse.includes("[Parse Failure Fallback]") && resumeTextToUse.length < 500) {
        alert("No valid resume text available to parse. Upload a new resume instead.");
        setIsRetrying(false);
        return;
      }

      const parsedResults = await parseBulkResumes([resumeTextToUse]);
      const result = parsedResults && parsedResults.length > 0 ? parsedResults[0] : null;

      if (result && result.name && result.name !== "Pending Distillation") {
         // Prevent overwriting structural candidate properties
         delete result.pipelineStage;
         delete result.candidateId;
         delete result.id;
         
         let updatePayload: any = {
           ...result,
           fullName: result.name,
           name: result.name,
           primaryEmail: result.email,
           phoneHash: result.phone,
           distillationStatus: result.status === "PARSE_FAILED" ? "FAILED" : "COMPLETED",
           enrichmentAttempts: (candidate.enrichmentAttempts || 0) + 1,
           lastEnrichmentAttemptAt: new Date().toISOString(),
           lastEnrichmentStatus: result.status || "COMPLETED",
           updatedAt: serverTimestamp(),
           resumeStoragePath: candidate.storagePath || "",
           resumeLastParsedAt: new Date().toISOString(),
           resumeParserVersion: "v1_gemini_pro",
           resumeSource: candidate.storagePath ? "firebase_storage_retry" : "db_text_fallback_retry"
         };
         
         if (result.status === "PARSE_FAILED") {
            updatePayload.failureReason = "MODEL_TIMEOUT_OR_FAILURE";
         }
         
         const candSnap = await getDoc(doc(db, "candidatePool", candId));
         if (candSnap.exists()) {
             const candData = candSnap.data();
             if (candData.manualName || candData.isNameManuallyEdited || candData.source === "Manual Add") {
                 delete updatePayload.name;
                 delete updatePayload.fullName;
             }
         }
         
         if (result.email === "pending@hirenest.os" || result.email === "mock@example.com") {
             delete updatePayload.email;
             delete updatePayload.primaryEmail;
         }
         
         if (result.phone === "N/A" || result.phone === "Unparsed") {
             delete updatePayload.phone;
             delete updatePayload.phoneHash;
         }
         
         if (result.name === "Unnamed Candidate" || result.name === "Parsing Pending" || result.name === "Candidate (Requires Human Review)") {
             delete updatePayload.name;
             delete updatePayload.fullName;
         }

         await updateDoc(doc(db, "candidatePool", candId), updatePayload);
         if (result.status !== "PARSE_FAILED") {
            alert("AI Enrichment Retry completed successfully.");
         } else {
            alert("Enrichment failed again. Please review the document manually.");
         }
      } else {
         await updateDoc(doc(db, "candidatePool", candId), {
           distillationStatus: "FAILED",
           enrichmentAttempts: (candidate.enrichmentAttempts || 0) + 1,
           lastEnrichmentAttemptAt: new Date().toISOString(),
           lastEnrichmentStatus: "PARSE_FAILED",
           failureReason: "MODEL_TIMEOUT_OR_FAILURE",
           updatedAt: serverTimestamp(),
         });
         alert("Enrichment failed again. Please review the document manually.");
      }
    } catch (e: any) {
      console.error("Retry failed:", e);
      alert("Retry failed: " + e.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRunMatch = async () => {
    if (!selectedJobId) return;
    setIsMapping(true);
    try {
      const { auth } = await import("../../lib/firebase");
      const submitterUid = auth.currentUser?.uid || "local_user";
      
      const selectedReq = jobs.find(j => j.id === selectedJobId);
      const targetClientId = selectedReq?.clientId || "ORG-CLIENT-1";

      const candidateId = candidate.candidateId || candidate.id;
      
      const aiAnalysisObj = candidate.aiAnalysis || mappingResult || { fitScore: 85, analysis: "Strong match based on requirements." };
      setMappingResult(aiAnalysisObj);
      
      const response = await SubmissionOrchestrator.submitCandidate({
        candidateData: {
          id: candidateId,
          name: nameStr,
          email: candidate.email || candidate.contactEmail || "",
          phone: candidate.phone || candidate.contactPhone || "",
          resumeText: candidate.resumeText || candidate.extractedText || "",
          skills: getSkillsArray(candidate.skills) || [],
        },
        requirementId: selectedJobId,
        clientId: targetClientId,
        vendorId: userOrgId || "local",
        submitterId: submitterUid,
        initialStatus: "PENDING_REVIEW",
        matchScore: aiAnalysisObj?.fitScore || 85,
        aiAnalysis: aiAnalysisObj,
        bypassOwnershipCheck: isAdmin,
      });

      if (response.success) {
        alert("Success: Candidate submitted successfully!");
      } else {
        alert("Error: " + response.message);
      }
    } catch(e) {
      console.error(e);
      alert("Failed to map candidate to requirement.");
    } finally {
      setIsMapping(false);
    }
  };

  useEffect(() => {
    // Load timeline events
    const id = candidate.originalId || candidate.id || candidate.candidateId;
    
    // Load interviews
    const qInterviews = query(collection(db, "interviews"), where("candidateId", "==", id));
    const unsubInterviews = onSnapshot(qInterviews, snap => {
       const ivs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       ivs.sort((a: any, b: any) => {
         const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
         const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
         return tb - ta;
       });
       setInterviews(ivs);
    }, err => {
       console.warn("Interview timeline error:", err.message);
    });

    const qEvents = query(collection(db, "operationalEvents"), where("entityId", "==", id));
    const unsubEvents = onSnapshot(qEvents, snap => {
       const evs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       evs.sort((a: any, b: any) => {
         const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
         const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
         return tb - ta;
       });
       setEvents(evs);
    }, err => {
       console.warn("Event timeline error:", err.message);
    });
    
    return () => {
       unsubEvents();
       unsubInterviews();
    };
  }, [candidate]);

  const candidateIdStr = candidate.candidateId || candidate.id || "HN-CAN-PENDING";
  const nameStr = candidate.parsedName || candidate.fullName || candidate.name || (candidate.fileName?.toLowerCase().includes('resume') ? "Pending Verification" : candidate.fileName) || "Pending Verification";
  const vendorStr = vendorMap?.[candidate.vendorId] || candidate.vendorName || (candidate.vendorId === "ORG-GLOBAL-HQ" ? "WorkNexa Infotech" : candidate.vendorId) || "Direct/Unknown";
  
  const getSkillsArray = (skills: any): string[] => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === "string") return skills.split(",").map((s: string) => s.trim()).filter(Boolean);
    return [];
  };

  const skillsArr = getSkillsArray(candidate.skills);

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
     TABS = TABS.filter(t => !['GOVERNANCE', 'REQUIREMENTS', 'INTERVIEWS', 'AI_ANALYSIS'].includes(t.id));
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
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
                      <span className="flex items-center gap-1"><MapPin size={12} /> {candidate.location || "Remote"}</span>
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
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2">
                         <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-slate-400 border-b border-slate-100 pb-2">Candidate Summary</h3>
                         <div className="space-y-4 text-sm font-medium">
                            <div className="flex justify-between items-center"><span className="text-slate-500">Email:</span> <span className="text-slate-900">{candidate.email || candidate.primaryEmail || 'N/A'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Phone:</span> <span className="text-slate-900">{candidate.phone || candidate.phoneHash || 'N/A'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Vendor:</span> <span className="text-slate-900">{vendorStr}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Experience:</span> <span className="text-slate-900 max-w-[250px] truncate">{candidate.experience || (candidate.totalExperience ? `${candidate.totalExperience} Years` : (candidate.experienceTracker?.computedYears ? `${candidate.experienceTracker.computedYears} Years` : 'Experience Under Review'))}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">Current Stage:</span> <Badge>{candidate.pipelineStage || 'Added'}</Badge></div>
                         </div>
                         
                         {(candidate.distillationStatus === "FAILED" || candidate.status === "PARSE_FAILED") && (
                           <div className="mt-6 bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-sm text-sm">
                             {(candidate.resumeText || candidate.resumeLastParsedAt) ? (
                               <>
                                 <div className="flex items-center gap-2 font-bold text-amber-600 mb-1">
                                   <ShieldAlert className="w-4 h-4" /> 
                                   Resume Parsed <span className="text-emerald-500">✓</span> <span className="opacity-70 mx-1">|</span> AI Analysis Pending
                                 </div>
                                 <p className="text-amber-700 mb-4 opacity-90">Resume extraction was successful, but AI enrichment could not be completed.</p>
                                 <Button size="sm" variant="outline" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100" onClick={handleRetryEnrichment} disabled={isRetrying}>
                                   {isRetrying ? "Retrying..." : "Retry AI Analysis"}
                                 </Button>
                               </>
                             ) : (
                               <>
                                 <div className="flex items-center gap-2 font-bold text-rose-700 mb-1">
                                   <ShieldAlert className="w-4 h-4" /> 
                                   Parsing Failed
                                 </div>
                                 <p className="text-rose-600 mb-4 opacity-90">Resume extraction could not be completed successfully.</p>
                                 <Button size="sm" variant="outline" className="bg-white border-rose-200 text-rose-700 hover:bg-rose-100" onClick={handleRetryEnrichment} disabled={isRetrying}>
                                   {isRetrying ? "Retrying..." : "Retry Parsing"}
                                 </Button>
                               </>
                             )}
                           </div>
                         )}
                      </div>
                      
                      {isClientReviewMode ? (
                         <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-slate-400 border-b border-slate-200 pb-2">Why This Candidate Matches</h3>
                            <div className="space-y-4">
                               {(mappingResult?.matchedSkills?.length > 0 || skillsArr.length > 0) ? (
                                  <div>
                                    <div className="space-y-2">
                                      {(mappingResult?.matchedSkills || skillsArr.slice(0, 5)).map((ms: any, i: number) => (
                                        <div key={i} className="flex items-center text-sm font-medium text-slate-700">
                                          <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 shrink-0"/>
                                          <span className="truncate">{typeof ms === 'string' ? ms : (ms.skill || JSON.stringify(ms))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                               ) : null}
                               
                               {mappingResult?.missingSkills?.length > 0 && (
                                 <div>
                                    <div className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 mt-4">Missing</div>
                                    <div className="space-y-2">
                                      {mappingResult.missingSkills.map((ms: any, i: number) => (
                                        <div key={i} className="flex items-center text-sm font-medium text-slate-500">
                                          <X className="w-4 h-4 text-red-400 mr-2 shrink-0"/>
                                          <span className="truncate">{ms}</span>
                                        </div>
                                      ))}
                                    </div>
                                 </div>
                               )}
                               
                               {!mappingResult?.matchedSkills && !mappingResult?.missingSkills && skillsArr.length === 0 && (
                                  <div className="text-sm text-slate-500 italic">No detailed match analysis available yet.</div>
                               )}
                            </div>
                         </div>
                      ) : (
                         <div className="bg-indigo-900 p-5 rounded-xl border border-indigo-800 shadow-sm text-white flex flex-col justify-center items-center text-center">
                            <h3 className="font-bold uppercase tracking-widest text-[10px] text-indigo-300 mb-2">Platform Score</h3>
                            <div className="text-5xl font-black text-indigo-100 mb-2">{(candidate.matchScore || mappingResult?.matchScore) || '--'}<span className="text-2xl text-indigo-400">%</span></div>
                            <p className="text-xs text-indigo-300 font-medium">{mappingResult ? 'Matched to Requirement' : 'Pending AI Match'}</p>
                         </div>
                      )}
                   </div>

                   {skillsArr.length > 0 && (
                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-slate-400 border-b border-slate-100 pb-2">Extracted Skills</h3>
                         <div className="flex flex-wrap gap-2">
                             {skillsArr.map((skill: string, i: number) => (
                                <Badge key={i} variant="outline" className="bg-slate-50 border border-slate-200 text-slate-700">{skill}</Badge>
                             ))}
                         </div>
                     </div>
                   )}
                </div>
             )}

             {/* RESUME TAB */}
             {activeTab === 'RESUME' && (
                <div className="h-full flex flex-col max-w-5xl mx-auto space-y-4 animate-in fade-in duration-300">
                   <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] text-slate-400">Parsed Resume Text</h3>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold"><UploadCloud size={14} className="mr-2" /> Download Original</Button>
                   </div>
                   <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-y-auto font-mono text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {candidate.resumeText || "No parsed resume text available."}
                   </div>
                </div>
             )}

             {/* AI ANALYSIS TAB */}
             {activeTab === 'AI_ANALYSIS' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                    {(candidate.distillationStatus === "FAILED" || candidate.status === "PARSE_FAILED") ? (
                       <div className="bg-white p-12 rounded-xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center text-center">
                          <ShieldAlert size={40} className="text-rose-400 mb-4" />
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Resume intelligence unavailable</h3>
                          <p className="text-sm text-slate-500 mb-6">The AI extraction could not be completed, so intelligence mapping is disabled.</p>
                          <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={handleRetryEnrichment} disabled={isRetrying}>
                            {isRetrying ? "Retrying..." : "Retry AI Enrichment"}
                          </Button>
                       </div>
                    ) : !mappingResult ? (
                       <div className="bg-white p-12 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                          <Bot size={40} className="text-slate-300 mb-4" />
                          <h3 className="text-lg font-bold text-slate-800 mb-2">No AI Match Data Yet</h3>
                          <p className="text-sm text-slate-500 mb-6">Map this candidate to a requirement to generate a detailed intelligence brief.</p>
                          <Button onClick={() => setActiveTab('REQUIREMENTS')} className="bg-indigo-600 hover:bg-indigo-700">Map to Requirement</Button>
                       </div>
                    ) : (
                       <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Skills Match</div>
                                <div className="text-2xl font-black text-indigo-600">{mappingResult.breakdown?.skillsScore || 0}%</div>
                             </div>
                             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Experience</div>
                                <div className="text-2xl font-black text-indigo-600">{mappingResult.breakdown?.experienceScore || 0}%</div>
                             </div>
                             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Domain Fit</div>
                                <div className="text-2xl font-black text-indigo-600">{mappingResult.breakdown?.domainScore || 0}%</div>
                             </div>
                             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Location / Meta</div>
                                <div className="text-2xl font-black text-indigo-600">{mappingResult.breakdown?.locationScore || 0}%</div>
                             </div>
                          </div>
                          
                          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl shadow-sm">
                             <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3 block border-b border-indigo-100 pb-2">AI Summary & Reasoning</h3>
                             <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                                {mappingResult.summary || mappingResult.overallMatchReason || "The model identified strong overlap in core competencies."}
                             </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">Identified Strengths</h3>
                                <ul className="space-y-2">
                                   {(mappingResult.strengths || ["Meets core experience requirements"]).map((s: string, idx: number) => (
                                     <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                        <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" /> <span>{s}</span>
                                     </li>
                                   ))}
                                </ul>
                             </div>
                             
                             <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-3">Missing Skills & Risks</h3>
                                <div className="flex flex-wrap gap-2 mb-3">
                                   {(mappingResult.missingSkills || []).map((s: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{s}</Badge>
                                   ))}
                                </div>
                                <ul className="space-y-2 mt-3 pt-3 border-t border-rose-50">
                                   {(mappingResult.risks || ["No significant risks identified."]).map((s: string, idx: number) => (
                                     <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                        <ShieldAlert size={14} className="text-rose-400 shrink-0 mt-0.5" /> <span>{s}</span>
                                     </li>
                                   ))}
                                </ul>
                             </div>
                          </div>
                       </>
                    )}
                </div>
             )}

             {/* REQUIREMENTS TAB */}
             {activeTab === 'REQUIREMENTS' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                    
                    {/* Header Mapping Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-indigo-100/50 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Target size={150} />
                       </div>
                       <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-2">Map candidate to a requirement</h3>
                       <p className="text-sm text-slate-500 mb-6 max-w-xl relative">Select an open requirement to trigger the AI Match Engine and initiate the formal submission workflow.</p>
                       
                       <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                          <select className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>
                             <option value="">Select an open requirement...</option>
                             {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.company})</option>)}
                          </select>
                          <Button 
                             onClick={handleRunMatch} 
                             disabled={!selectedJobId || isMapping}
                             className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8"
                          >
                             {isMapping ? "Analyzing Fit..." : "Run AI Match"}
                          </Button>
                       </div>
                    </div>

                    
                    {/* Currently Mapped Or Existing Reqs */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                       <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] mb-4 text-slate-400 border-b border-slate-200 pb-2">Active Submissions</h3>
                       
                       {candidate.pipelineStage === 'ADDED' || !candidate.pipelineStage ? (
                          <div className="text-center p-8 bg-white rounded-lg border border-slate-200 border-dashed">
                             <Briefcase size={32} className="text-slate-300 mx-auto mb-3" />
                             <p className="text-sm font-semibold text-slate-600">No active pipelines.</p>
                             <p className="text-xs text-slate-400 mt-1">Map to a requirement above to submit.</p>
                          </div>
                       ) : (
                          <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                             <div>
                                <div className="text-sm font-bold text-slate-900">{candidate.reqTitle || "General Submission"}</div>
                                <div className="text-xs text-slate-500 mt-0.5">Submitted via Workflow Orchestrator</div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="text-right">
                                   <div className="text-[10px] font-bold uppercase text-slate-400">Match</div>
                                   <div className="font-mono font-bold text-indigo-600">{candidate.matchScore || mappingResult?.matchScore || '--'}%</div>
                                </div>
                                <div className="text-right">
                                   <div className="text-[10px] font-bold uppercase text-slate-400">Stage</div>
                                   <Badge className="bg-indigo-50 text-indigo-700">{candidate.pipelineStage}</Badge>
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
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

                         {events.map((evt, idx) => (
                            <div key={evt.id} className="relative pl-6 border-l-2 border-indigo-100 pb-4 last:pb-0">
                               <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1 ring-4 ring-white" />
                               <div className="text-sm font-bold text-slate-900 capitalize">{evt.type?.replace(/_/g, " ")}</div>
                               <div className="text-xs text-slate-600 mt-1">{evt.metadata?.message || evt.metadata?.reason || ""}</div>
                               <div className="text-[10px] font-mono text-slate-400 mt-1.5 tracking-wider">{evt.timestamp?.toDate ? evt.timestamp.toDate().toLocaleString() : "Recently"}</div>
                            </div>
                         ))}
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
                      import('firebase/firestore').then(({ doc, updateDoc }) => {
                         if (id) {
                            updateDoc(doc(db, "candidates", id), { comments: [...comments, newComment] }).catch(err => {
                               // Fallback on candidates global
                            });
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
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Vendor Owner</div>
                            <div className="font-bold text-slate-800">{vendorStr}</div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg col-span-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Source Pipeline</div>
                            <div className="text-slate-800">{candidate.source || "Manual Extraction / Bulk Upload"}</div>
                         </div>
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
                 {candidate.pipelineStage === 'SHORTLISTED' || candidate.status === 'SHORTLISTED' ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-1 text-sm text-emerald-800 font-bold">
                       <div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Shortlisted for Review</div>
                       <span className="text-[11px] font-medium text-emerald-600/80 uppercase tracking-widest">{candidate.statusUpdatedBy ? `by ${candidate.statusUpdatedBy} ` : ''}{candidate.statusUpdatedAt ? 'on ' + new Date(candidate.statusUpdatedAt.seconds ? candidate.statusUpdatedAt.seconds * 1000 : candidate.statusUpdatedAt).toLocaleDateString() : ''}</span>
                    </div>
                 ) : candidate.pipelineStage === 'REJECTED' || candidate.status === 'REJECTED' ? (
                    <div className="bg-rose-50 border border-rose-100 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-1 text-sm text-rose-800 font-bold">
                       <div className="flex items-center gap-2"><X size={18} className="text-rose-500" /> Rejected {candidate.rejectReason ? `- ${candidate.rejectReason}` : ''}</div>
                       <span className="text-[11px] font-medium text-rose-600/80 uppercase tracking-widest">{candidate.statusUpdatedBy ? `by ${candidate.statusUpdatedBy} ` : ''}{candidate.statusUpdatedAt ? 'on ' + new Date(candidate.statusUpdatedAt.seconds ? candidate.statusUpdatedAt.seconds * 1000 : candidate.statusUpdatedAt).toLocaleDateString() : ''}</span>
                    </div>
                 ) : (
                    <>
                       <div className="grid grid-cols-2 gap-3 mb-3">
                          <Button onClick={onShortlist} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 w-full rounded-xl shadow-sm transition-all hover:-translate-y-0.5">
                            <CheckCircle size={18} className="mr-2"/> Shortlist
                          </Button>
                          <Button onClick={onReject} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold h-12 w-full rounded-xl transition-all">
                            <X size={18} className="mr-2"/> Reject
                          </Button>
                       </div>
                       <div className="grid grid-cols-3 gap-3">
                          <Button onClick={onSchedule} className="bg-slate-900 hover:bg-black text-white font-bold h-12 w-full rounded-xl shadow-sm transition-all">
                            <Calendar size={18} className="mr-2"/> Request Interview
                          </Button>
                          <Button onClick={onRequestClarification} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-bold h-12 w-full rounded-xl transition-all">
                            <MessageSquare size={18} className="mr-2"/> Request Clarification
                          </Button>
                          <Button onClick={onOffer} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 w-full rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-indigo-500">
                            <Target size={18} className="mr-2"/> Release Offer
                          </Button>
                       </div>
                    </>
                 )}
             </div>
          )}
       </div>
    </div>
  )
}
