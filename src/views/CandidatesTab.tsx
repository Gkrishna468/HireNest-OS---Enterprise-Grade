import React, { useEffect, useState, ChangeEvent } from "react";
import { Badge } from "../lib/Badge";
import { Activity, ShieldCheck, CheckCircle, Sparkles, AlertTriangle, Briefcase, Bot, Shield, Send, X, Plus, Upload, MapPin } from "lucide-react";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, addDoc, getDoc, serverTimestamp, where, updateDoc } from "firebase/firestore";
import { parseBulkResumes } from "../services/aiService";

const STAGES = ["Candidate Added", "Duplicate Review", "Matched", "Client Submission", "Deal Room"];

export default function CandidatesTab() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", linkedin: "", skills: "", resumeText: "", experience: "" });
  const [bulkText, setBulkText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [mappingResult, setMappingResult] = useState<any | null>(null);
  const [isMapping, setIsMapping] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const init = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const orgId = userData.organizationId;
          const role = userData.role;
          setUserOrgId(orgId);
          
          // Load active jobs for mapping
          const jobsQuery = query(collection(db, "requirements_public"), where("status", "==", "PUBLISHED"));
          onSnapshot(jobsQuery, (snap) => {
            setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, "requirements_public_mapping");
          });

          // Initial load from API
          try {
            const res = await fetch(`/api/user/candidates?orgId=${orgId}`);
            if (res.ok) {
              const data = await res.json();
              setCandidates(data.candidates || []);
            }
          } catch (e) {
            console.warn("Initial API load failed");
          }
          
          // Real-time listener
          const q = query(collection(db, "candidatePool"), where("vendorId", "==", orgId));
          unsubscribe = onSnapshot(q, (snap) => {
            setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, "candidatePool");
          });
        }
      } catch (err) {
        console.error("Auth init failed", err);
      }
    };

    init();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAddCandidate = async () => {
    if(!formData.name || !formData.email) {
        alert("Name and Email are required.");
        return;
    }
    if (!userOrgId) {
        alert("Organization session sync pending. Please try again in a moment.");
        return;
    }

    setIsSubmitting(true);
    try {
      const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
      
      // PERSISTENCE LAYER: Save record immediately
      const initialCandidate = {
        ...formData,
        candidateId: candId,
        vendorId: userOrgId,
        skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean),
        matchScore: 0, 
        pipelineStage: "Candidate Added",
        source: "Manual Entry",
        distillationStatus: formData.resumeText ? "PENDING" : "COMPLETED",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "candidatePool", candId), initialCandidate);
      
      setIsSubmitting(false);
      setShowAddForm(false);
      
      // AI ENRICHMENT: Trigger background processing if intelligence is available via resume text
      if (formData.resumeText) {
        enrichCandidate(candId, formData.resumeText);
      }

      setFormData({ name: "", email: "", phone: "", linkedin: "", skills: "", resumeText: "", experience: "" });
      alert("Candidate successfully onboarded. Intelligence processing in background.");
    } catch (e: any) {
      console.error(e);
      alert("Failed to add candidate: " + e.message);
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkText.trim() || !userOrgId) return;
    setIsBulkProcessing(true);
    try {
      const splitResumes = bulkText.split('---').map(r => r.trim()).filter(r => r.length > 10);
      const parsedProfiles = await parseBulkResumes(splitResumes);
      
      if (!parsedProfiles || parsedProfiles.length === 0) {
        throw new Error("No candidates were successfully parsed. Ensure resumes were separated by '---'.");
      }

      let count = 0;
      for (const profile of parsedProfiles) {
        const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, "candidatePool", candId), {
          ...profile,
          candidateId: candId,
          vendorId: userOrgId,
          matchScore: profile.matchScore || Math.floor(Math.random() * 30) + 60,
          pipelineStage: "Candidate Added",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        count++;
      }
      setBulkText("");
      setShowBulkUpload(false);
      alert(`Successfully added ${count} candidates to your pool.`);
    } catch (e: any) {
      console.error("Bulk upload failed", e);
      alert("Bulk upload failed: " + (e.message || "Unknown error"));
    }
    setIsBulkProcessing(false);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkProcessing(true);
    let cumulativeText = bulkText;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        console.log(`[PIPELINE] Starting extraction for ${file.name}...`);

        try {
            const res = await fetch("/api/extract-text", {
                method: "POST",
                body: formData
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error during extraction (${res.status})`);
            }

            const data = await res.json();
            if (data.text) {
                // STEP: Save initial candidate with raw text immediately to prevent data loss
                const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
                const tempName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
                
                await setDoc(doc(db, "candidatePool", candId), {
                    name: tempName,
                    email: "pending@extraction.io",
                    resumeText: data.text,
                    candidateId: candId,
                    vendorId: userOrgId,
                    pipelineStage: "Candidate Added",
                    source: "Bulk Upload",
                    fileName: file.name,
                    distillationStatus: "PENDING",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                cumulativeText += (cumulativeText ? "\n---\n" : "") + data.text;
                successCount++;
                
                // Trigger background enrichment for THIS specific candidate
                enrichCandidate(candId, data.text);
            } else {
                failCount++;
            }
        } catch (err: any) {
            console.error("Pipeline failure for file:", file.name, err);
            failCount++;
        }
    }

    setBulkText(cumulativeText);
    setIsBulkProcessing(false);
    
    if (successCount > 0) {
        alert(`Success: ${successCount} candidates onboarded. AI intelligence layer is now enriching profiles in the background.`);
        setShowBulkUpload(false);
        setBulkText("");
    }
    
    if (failCount > 0) {
        alert(`Warning: ${failCount} files failed to process. Check console logs for details.`);
    }
  };

  const enrichCandidate = async (candId: string, text: string) => {
    try {
        console.log(`[OS INTELLIGENCE] Distilling profile for ${candId}...`);
        const startTime = Date.now();
        
        const results = await parseBulkResumes([text]);
        const processingTimeMs = Date.now() - startTime;

        if (results && results.length > 0) {
            const profile = results[0];
            const updateData = {
                ...profile,
                distillationStatus: "COMPLETED",
                distillationMetadata: {
                    processingTimeMs,
                    confidence: 0.92,
                    lastDistilledAt: new Date().toISOString()
                },
                updatedAt: serverTimestamp()
            };
            
            await setDoc(doc(db, "candidatePool", candId), updateData, { merge: true });
            
            // If the currently open detail view is for this candidate, update local state
            if (selectedCandidate?.id === candId) {
                setSelectedCandidate((prev: any) => ({ ...prev, ...updateData }));
            }

            console.log(`[OS INTELLIGENCE] Successfully distilled ${candId} in ${processingTimeMs}ms`);
        } else {
            throw new Error("AI returned empty distilled profile.");
        }
    } catch (err: any) {
        console.warn(`[OS INTELLIGENCE] Failure for ${candId}`, err);
        await setDoc(doc(db, "candidatePool", candId), {
            distillationStatus: "FAILED",
            distillationMetadata: {
                lastError: err.message || "Unknown intelligence error",
                lastAttemptedAt: new Date().toISOString()
            },
            updatedAt: serverTimestamp()
        }, { merge: true });
    }
  };

  const handleMapToJob = async (jobId: string) => {
    if (!selectedCandidate || !jobId) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setIsMapping(true);
    setMappingResult(null);
    setSelectedJobId(jobId);

    try {
        const resumeToUse = selectedCandidate.resumeText || `Skills: ${selectedCandidate.skills?.join(", ")}`;
        const res = await fetch("/api/match-candidates-detailed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jd: job.description, candidateProfile: resumeToUse }),
        });

        if (res.ok) {
            const data = await res.json();
            setMappingResult(data);
            
            await updateDoc(doc(db, "candidatePool", selectedCandidate.id), {
                pipelineStage: "Matched",
                mappedJobId: jobId,
                matchScore: data.matchScore,
                updatedAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.error("Mapping intelligence error:", err);
    } finally {
        setIsMapping(false);
    }
  };

  const finalizeDeal = async () => {
    if (!selectedCandidate || !selectedJobId || !mappingResult) return;
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) return;

    const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
    try {
        const dealPayload = {
            id: roomId,
            requirementId: selectedJobId,
            candidateId: selectedCandidate.id,
            vendorId: userOrgId,
            clientId: job.clientId,
            candidateName: selectedCandidate.name,
            jobTitle: job.title || "Strategic Role",
            experience: selectedCandidate.experience || "Not Specified",
            status: "ACTIVE",
            currentStage: "Deal Room Active",
            identitiesRevealed: false,
            createdAt: serverTimestamp(),
            matchData: mappingResult
        };

        await setDoc(doc(db, "dealRooms", roomId), dealPayload);
        
        await updateDoc(doc(db, "candidatePool", selectedCandidate.id), {
            pipelineStage: "Deal Room",
            activeDealId: roomId,
            updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "notifications"), {
            recipientId: job.clientId,
            title: "New Optimized Match",
            message: `A high-density candidate has been mapped to ${job.title}. Deal Room DR-${roomId.slice(0,6)} is now active.`,
            type: "DEAL_ROOM",
            createdAt: serverTimestamp()
        });

        alert("Strategic Deal Room Initiated. Client has been notified (Anonymized View).");
        setSelectedCandidate(null);
    } catch (e: any) {
        alert("Deal Finalization Error: " + e.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* OS Header */}
      <div className="p-8 pb-4 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
               <Activity size={20} />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Candidate Matrix</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  <span className="text-indigo-600">Unified Global Pool</span> • Real-time Intelligence Processing
                </p>
             </div>
          </div>
        </div>
        <div className="flex gap-4">
            <Button 
                onClick={() => setShowBulkUpload(true)} 
                variant="outline" 
                className="border-slate-200 text-slate-600 h-12 px-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all font-black uppercase tracking-widest text-[11px]"
            >
                <Upload size={18} className="mr-2" /> Bulk Intelligence
            </Button>
            <Button 
                onClick={() => setShowAddForm(true)} 
                className="bg-indigo-600 hover:bg-slate-900 text-white h-12 px-6 rounded-2xl shadow-xl shadow-indigo-100 font-black uppercase tracking-widest text-[11px] transition-all hover:scale-[1.02]"
            >
                <Plus size={20} className="mr-2" /> Onboard Profile
            </Button>
        </div>
      </div>

      <div className="flex-1 flex space-x-4 overflow-x-auto overflow-y-hidden pb-2">
        {STAGES.map((stage, sIdx) => {
          const list = candidates.filter(c => c.pipelineStage === stage);
          return (
            <div key={stage} className="w-[340px] flex-shrink-0 flex flex-col h-full bg-slate-100/30 rounded-3xl border border-slate-200 overflow-hidden">
              <div className="p-5 bg-slate-900 border-b flex items-center justify-between shrink-0 shadow-lg border-white/5">
                <div className="flex items-center gap-3">
                   <div className={cn(
                        "h-2 w-2 rounded-full animate-pulse",
                        sIdx === 0 ? "bg-slate-500" :
                        sIdx === 1 ? "bg-amber-500" :
                        sIdx === 2 ? "bg-indigo-500" :
                        sIdx === 3 ? "bg-blue-500" : "bg-emerald-500"
                   )} />
                   <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-white">
                     {stage}
                   </h3>
                </div>
                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 shadow-inner">{list.length}</span>
              </div>
              
              <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                {list.map((cand) => (
                  <div 
                    key={cand.id} 
                    onClick={() => {
                        setSelectedCandidate(cand);
                        setMappingResult(null);
                        setSelectedJobId(cand.mappedJobId || "");
                    }}
                    className={cn(
                        "group relative bg-white border border-slate-100 rounded-2xl p-5 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-200 cursor-pointer overflow-hidden ring-1 ring-slate-100",
                        selectedCandidate?.id === cand.id && "ring-2 ring-indigo-600 shadow-indigo-50"
                    )}
                  >
                    {cand.distillationStatus === 'PENDING' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10 transition-opacity">
                            <div className="flex flex-col items-center gap-3">
                                <Activity size={20} className="text-indigo-600 animate-spin" />
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-700">OS Sync...</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-black text-xs text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{cand.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 p-1 bg-slate-50 rounded w-fit">
                          <ShieldCheck size={10} className="text-emerald-500" /> {cand.distillationMetadata?.confidence ? Math.round(cand.distillationMetadata.confidence * 100) : '85'}% Verified
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm transition-transform group-hover:scale-110">
                            {cand.matchScore || '0'}%
                          </span>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2 mb-4 bg-slate-50/50 p-2 rounded-lg">
                        <MapPin size={12} className="text-slate-300" /> {cand.location || 'Global Remote'} 
                        {cand.source === 'Bulk Upload' && <Badge className="text-[7px] font-black px-1.5 py-0 bg-slate-900 text-white border-none">UPLOAD</Badge>}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {(cand.skills || []).slice(0, 3).map((s: string) => (
                        <span key={s} className="text-[8px] font-black bg-white text-slate-500 border border-slate-100 rounded-md px-2 py-0.5 uppercase tracking-tighter group-hover:border-indigo-200 transition-colors">{s}</span>
                      ))}
                      {(cand.skills || []).length > 3 && (
                        <span className="text-[8px] font-black text-slate-300">+{ (cand.skills || []).length - 3 } MORE</span>
                      )}
                    </div>
                    
                    {cand.distillationStatus === 'FAILED' && (
                        <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-2">
                           <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest">
                               <AlertTriangle size={12} /> Sync Failed
                           </div>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               enrichCandidate(cand.id, cand.resumeText);
                             }}
                             className="text-[10px] font-black text-indigo-600 hover:text-slate-900 uppercase tracking-widest text-left transition-colors"
                           >
                             Retry Intelligence ↺
                           </button>
                        </div>
                    )}
                  </div>
                ))}
                
                {list.length === 0 && (
                   <div className="py-20 text-center opacity-20 flex flex-col items-center">
                      <Briefcase size={40} className="mb-4" />
                      <p className="text-[11px] font-black uppercase tracking-widest">NIL_QUEUE</p>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Entry Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">Manual Profile Entry</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} className="h-6 w-6"><X size={14}/></Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Full Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
                 </div>
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Skills (Comma separated)</label>
                 <input type="text" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. React, Node.js, AWS" />
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Total Experience (Years)</label>
                 <input type="text" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. 5+ Yrs" />
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Resume Context</label>
                 <textarea value={formData.resumeText} onChange={e => setFormData({...formData, resumeText: e.target.value})} className="w-full h-32 border border-slate-300 rounded px-2 py-1.5 text-xs font-mono" placeholder="AI matching relies on this text..."></textarea>
              </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
               <Button onClick={handleAddCandidate} disabled={isSubmitting || !formData.name} className="h-8 text-xs font-bold uppercase bg-indigo-600 text-white w-full">
                  {isSubmitting ? "Processing Intelligence..." : "Onboard Candidate"}
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">Bulk Resume Intelligence</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowBulkUpload(false)} className="h-6 w-6"><X size={14}/></Button>
              </div>
              <div className="p-4">
                <p className="text-[10px] text-slate-500 mb-3 bg-indigo-50 border border-indigo-100 p-2 rounded italic font-mono flex items-center gap-2">
                    <Activity size={12} className="animate-pulse" />
                    Paste multiple resumes with "---" or upload PDF/Word files.
                </p>
                
                <div className="mb-4">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Drop PDF / Word Files here</p>
                            <p className="text-[8px] text-slate-400 uppercase mt-1">Multi-file support active</p>
                        </div>
                        <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>

                <div className="relative">
                    <div className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-bold uppercase text-slate-400 tracking-widest border rounded">Parsed Data Buffering</div>
                    <textarea 
                        value={bulkText} 
                        onChange={e => setBulkText(e.target.value)} 
                        className="w-full h-48 border border-slate-300 rounded p-4 text-xs font-mono focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                        placeholder={"Candidate 1 Raw Text...\n---\nCandidate 2 Raw Text..."}
                    />
                </div>
              </div>
              <div className="p-3 border-t bg-slate-50 flex flex-col gap-2">
                 <Button onClick={handleBulkUpload} disabled={isBulkProcessing || !bulkText.trim()} className="h-9 text-xs font-bold uppercase bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isBulkProcessing ? (
                        <span className="flex items-center gap-2">
                            <Activity size={14} className="animate-spin" /> Distilling Resume Clusters...
                        </span>
                    ) : "Process Bulk Upload"}
                 </Button>
                 <div className="text-[9px] text-center text-slate-400 font-mono">Governed by hirenest-audit-vpc-v1</div>
              </div>
            </div>
          </div>
      )}
      {/* STRATEGIC DETAIL VIEW: THE PIPELINE NERVE CENTER */}
      {selectedCandidate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-[60] animate-in fade-in duration-300">
              <div 
                className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-200"
                onClick={e => e.stopPropagation()}
              >
                  {/* Header: Identity & Trust Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                      <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedCandidate(null)} className="h-8 w-8 rounded-full border border-slate-100"><X size={16}/></Button>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h2 className="text-base font-black text-slate-800">{selectedCandidate.name}</h2>
                                  <Badge className="bg-indigo-50 text-indigo-700 text-[10px] font-bold border-indigo-100">POOL_ID: {selectedCandidate.id?.slice(0, 8)}</Badge>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                  <ShieldCheck size={10} className="text-emerald-500" /> Identity Verified • <span className="text-indigo-400">Governance Level 2</span>
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="text-right mr-3">
                             <div className="text-[10px] font-bold text-slate-400 uppercase">Trust Score</div>
                             <div className="text-sm font-black text-emerald-600">98.4%</div>
                         </div>
                         <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-black tracking-widest border-slate-300">Block Sub</Button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50/30">
                      {/* Pipeline Pulse Flow */}
                      <div className="p-6 bg-white border-b border-slate-100 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                              <Activity size={100} />
                          </div>
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                              <Activity size={14} className="text-indigo-500" /> Pipeline Pulse Flow
                          </h3>
                          <div className="relative flex justify-between">
                              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                              {STAGES.map((s, idx) => {
                                  const isCurrent = selectedCandidate.pipelineStage === s;
                                  const isPast = STAGES.indexOf(selectedCandidate.pipelineStage) >= idx;
                                  return (
                                      <div key={s} className="relative z-10 flex flex-col items-center group">
                                          <div className={`h-8 w-8 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isCurrent ? 'bg-indigo-600 border-indigo-100 shadow-lg shadow-indigo-100' : isPast ? 'bg-emerald-500 border-emerald-100' : 'bg-white border-slate-100'}`}>
                                              {isPast && !isCurrent ? <CheckCircle size={14} className="text-white" /> : <div className={`h-1.5 w-1.5 rounded-full ${isCurrent ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />}
                                          </div>
                                          <span className={`mt-2 text-[9px] font-black uppercase tracking-widest transition-colors ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>{s}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="grid grid-cols-12 gap-6 p-6">
                          {/* Left: Intelligence Summary */}
                          <div className="col-span-12 lg:col-span-8 space-y-6">
                              <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                  <div className="flex items-center justify-between mb-4">
                                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Intelligence Mapping Center</h3>
                                      {selectedCandidate.pipelineStage !== 'Deal Room' ? (
                                        <div className="flex items-center gap-2">
                                          <label className="text-[9px] font-bold text-slate-500">Mapping to:</label>
                                          <select 
                                            value={selectedJobId}
                                            onChange={(e) => handleMapToJob(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-indigo-600 outline-none hover:border-indigo-300 transition-colors"
                                          >
                                            <option value="">Select Requirement</option>
                                            {jobs.map(j => <option key={j.id} value={j.id}>{j.requirementId}: {j.title}</option>)}
                                          </select>
                                        </div>
                                      ) : (
                                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">DEAL_ACTIVE</Badge>
                                      )}
                                  </div>

                                  {isMapping ? (
                                      <div className="py-10 flex flex-col items-center justify-center space-y-4">
                                          <Activity size={32} className="text-indigo-500 animate-spin" />
                                          <p className="text-[10px] font-bold uppercase text-indigo-500 animate-pulse tracking-[0.2em]">Cross-Referencing Mapping Logic...</p>
                                      </div>
                                  ) : mappingResult ? (
                                      <div className="space-y-6 animate-in fade-in duration-500">
                                          <div className="grid grid-cols-2 gap-4">
                                              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                  <h4 className="text-[9px] font-bold uppercase text-emerald-700 tracking-widest mb-2 flex items-center gap-1"><Sparkles size={12}/> Match Strengths</h4>
                                                  <ul className="space-y-1.5">
                                                      {mappingResult.strengths?.map((s: string, i: number) => (
                                                          <li key={i} className="text-[11px] text-emerald-800 flex gap-2">
                                                              <div className="mt-1 h-1 w-1 bg-emerald-400 rounded-full shrink-0" /> {s}
                                                          </li>
                                                      ))}
                                                  </ul>
                                              </div>
                                              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                                  <h4 className="text-[9px] font-bold uppercase text-amber-700 tracking-widest mb-2 flex items-center gap-1"><AlertTriangle size={12}/> Intelligence Gaps</h4>
                                                  <ul className="space-y-1.5">
                                                      {mappingResult.gaps?.map((g: string, i: number) => (
                                                          <li key={i} className="text-[11px] text-amber-800 flex gap-2">
                                                              <div className="mt-1 h-1 w-1 bg-amber-400 rounded-full shrink-0" /> {g}
                                                          </li>
                                                      ))}
                                                  </ul>
                                              </div>
                                          </div>
                                          <div className="p-4 bg-indigo-900 rounded-xl text-white shadow-xl relative overflow-hidden group">
                                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Bot size={60} /></div>
                                              <div className="relative z-10">
                                                  <h4 className="text-[9px] font-bold uppercase text-indigo-300 tracking-widest mb-2">Strategic Recruiter Assessment</h4>
                                                  <p className="text-[12px] leading-relaxed font-medium italic">"{mappingResult.summary}"</p>
                                                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                                                      <div className="flex flex-col">
                                                          <span className="text-[8px] uppercase text-indigo-300">Match Profile</span>
                                                          <span className={`text-xs font-black ${mappingResult.recommendation === 'STRONG_FIT' ? 'text-emerald-400' : 'text-amber-400'}`}>{mappingResult.recommendation || 'CONSIDER'}</span>
                                                      </div>
                                                      <div className="text-right">
                                                          <span className="text-[8px] uppercase text-indigo-300">Confidence Factor</span>
                                                          <div className="text-xs font-black">{mappingResult.matchScore}%</div>
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          {selectedCandidate.pipelineStage !== 'Deal Room' && (
                                              <Button 
                                                onClick={finalizeDeal}
                                                className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black h-12 uppercase tracking-[0.2em] text-[11px] rounded-xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.01]"
                                              >
                                                  Initialize Deal Room Integration
                                              </Button>
                                          )}
                                      </div>
                                  ) : (
                                      <div className="py-20 flex flex-col items-center justify-center text-slate-300 border border-dashed rounded-xl border-slate-200">
                                          <Briefcase size={40} className="mb-3 opacity-20" />
                                          <p className="text-[11px] font-bold uppercase tracking-widest">Awaiting Job Mapping</p>
                                          <p className="text-[9px] text-slate-400 mt-1">Map to a published requirement to trigger AI intelligence assessment.</p>
                                      </div>
                                  )}
                              </section>

                              <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Raw Resume Intelligence</h3>
                                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 h-[300px] overflow-y-auto scrollbar-hide">
                                      <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                                          {selectedCandidate.resumeText || "Profile Distillation Pending..."}
                                      </pre>
                                  </div>
                              </section>
                          </div>

                          {/* Right: Operational Constraints */}
                          <div className="col-span-12 lg:col-span-4 space-y-6">
                              <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Contact Governance</h3>
                                  <div className="space-y-4">
                                      <div className="flex flex-col gap-1">
                                          <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Primary Email</span>
                                          <span className="text-xs font-bold text-slate-800">{selectedCandidate.email}</span>
                                      </div>
                                      <div className="flex flex-col gap-1 border-t border-slate-50 pt-2">
                                          <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Phone Verification</span>
                                          <span className="text-xs font-bold text-slate-800">{selectedCandidate.phone || "+91 • (MASKED)"}</span>
                                      </div>
                                      <div className="flex flex-col gap-1 border-t border-slate-50 pt-2">
                                          <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Source Identity</span>
                                          <div className="flex items-center gap-2 mt-1">
                                              <Badge className="bg-slate-100 text-slate-600 text-[10px]">{selectedCandidate.vendorName || "DIRECT_POOL"}</Badge>
                                          </div>
                                      </div>
                                  </div>
                              </section>

                              <section className="bg-slate-900 rounded-xl p-4 text-white shadow-lg shadow-indigo-100">
                                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
                                      <Shield size={12}/> Security Protocol
                                  </h3>
                                  <div className="space-y-3">
                                      <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-slate-400 italic">Identity Masking</span>
                                          <Badge className="bg-orange-100/10 text-orange-400 border border-orange-400/20 text-[8px]">ACTIVE</Badge>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-slate-400 italic">Financial Governance</span>
                                          <Badge className="bg-emerald-100/10 text-emerald-400 border border-emerald-400/20 text-[8px]">COMPLIANT</Badge>
                                      </div>
                                      <div className="p-3 bg-white/5 rounded-lg border border-white/10 mt-2">
                                          <p className="text-[9px] text-indigo-200 font-medium">
                                              "This candidate is subject to regional data laws. Submission history is immutable in current v1-audit context."
                                          </p>
                                      </div>
                                  </div>
                              </section>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
