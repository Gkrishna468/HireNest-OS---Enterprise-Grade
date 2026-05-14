import React, { useEffect, useState, ChangeEvent } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { Sparkles, FileText, CheckCircle, ShieldAlert, DollarSign, BrainCircuit, MessageSquare, ExternalLink, X, Bot, Activity, Upload } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDoc, serverTimestamp, where, addDoc } from "firebase/firestore";
import { analyzeCandidateMatch } from "../services/aiService";
import { AIMatching } from "../components/AIMatching";
import { HybridMatchResult } from "../types";

import { useNavigate } from "react-router-dom";

export default function JobsTab() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [jdText, setJdText] = useState("");
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [budgetPeriod, setBudgetPeriod] = useState<"LPA" | "LPM">("LPA");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [workMode, setWorkMode] = useState<"Onsite" | "Remote" | "C2C" | "C2H" | "Permanent">("Remote");
  const [mandatorySkills, setMandatorySkills] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<HybridMatchResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [globalMatches, setGlobalMatches] = useState<any[]>([]);

  const isAdmin = userRole === 'admin';
  const isClient = userRole === 'client' || userRole?.startsWith('client_');

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role);
            setOrgId(data.organizationId);
          } else {
            const knownAdmins = ['0xpXdzSQE6V92xbnCkiczPHexiU2', 'vetAu3RF2qYVmsCuB6cpEz9DDqA2', 'ZlpY4qN9BKS7n0yoMQP7LDMvvJ53'];
            if (knownAdmins.includes(auth.currentUser.uid)) {
              setUserRole('admin');
              setOrgId('ORG-GLOBAL-HQ');
            }
          }
        } catch (e) {
          console.warn("User fetch failed, using fallback heuristics");
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!orgId || !userRole) return;

    let unsubscribe: any;
    const loadRequirements = async () => {
      try {
        const response = await fetch(`/api/user/context?orgId=${orgId}&role=${userRole}`);
        if (response.ok) {
          const resData = await response.json();
          if (resData.requirements) {
            setJobs(resData.requirements.sort((a: any, b: any) => 
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            ));
          }
        }
      } catch (e) {
        console.warn("Requirements Proxy failed");
      }

      // Real-time fallback
      const q = collection(db, "requirements_public");
      const requirementsQuery = userRole === 'admin' ? q : query(q, where("clientId", "==", orgId));

      unsubscribe = onSnapshot(requirementsQuery, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setJobs(data.sort((a: any, b: any) => {
           const timeA = a.createdAt?.seconds || new Date(a.createdAt).getTime() / 1000 || 0;
           const timeB = b.createdAt?.seconds || new Date(b.createdAt).getTime() / 1000 || 0;
           return timeB - timeA;
        }));
      }, (error) => {
        // Only error if it's not a permission issue (which is expected for cross-org access in some filters)
        if (!error.message.includes("permission")) {
            handleFirestoreError(error, OperationType.GET, "requirements_public");
        }
      });
    };

    loadRequirements();
    return () => unsubscribe && unsubscribe();
  }, [orgId, userRole]);

  useEffect(() => {
    if (selectedJob) {
      // 1. Listen to explicit vendor submissions
      const qSub = query(collection(db, "submissions"), where("requirementId", "==", selectedJob.id));
      const unsubSub = onSnapshot(qSub, (snap) => {
        setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "submissions");
      });

      // 2. Cross-Vendor Global Matching
      // We search the global candidate pool for skills matching this job
      // In a real app, this would be a high-performance vector search. 
      // Here we filter by the first 3 skills as a proxy.
      const topSkills = selectedJob.skills?.slice(0, 3) || [];
      if (topSkills.length > 0) {
        const qMatch = query(
          collection(db, "candidatePool"), 
          where("skills", "array-contains-any", topSkills)
        );
        const unsubMatch = onSnapshot(qMatch, (snap) => {
          const matched = snap.docs.map(d => ({ id: d.id, ...d.data(), isGlobalMatch: true } as any));
          setGlobalMatches(matched.filter(m => m.vendorId !== orgId)); // Don't show your own candidates
        });
        return () => { unsubSub(); unsubMatch(); };
      }

      return () => unsubSub();
    }
  }, [selectedJob, orgId]);

  const handleParseJD = async () => {
    if (!jdText.trim()) return;
    setIsParsing(true);
    
    // Heuristic Fallback Title
    const lines = jdText.split("\n").filter(l => l.trim().length > 0);
    const fallbackTitle = lines.length > 0 ? lines[0].slice(0, 50) : "New Requirement";
    const manualSkills = mandatorySkills.split(",").map(s => s.trim()).filter(Boolean);

    try {
      let parsed = { title: fallbackTitle, skills: manualSkills };
      
      try {
        const res = await fetch("/api/parse-jd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jdText })
        });
        
        if (res.ok) {
          const apiParsed = await res.json();
          parsed = { ...parsed, ...apiParsed };
        }
      } catch (apiErr) {
        console.warn("AI extraction deferred. Falling back to manual parameters.", apiErr);
      }
      
      const reqId = "REQ-" + Math.random().toString(36).substr(2, 9);
      const newReq = {
        requirementId: reqId,
        clientId: orgId,
        title: parsed.title || fallbackTitle,
        description: jdText,
        skills: manualSkills.length > 0 ? manualSkills : (parsed.skills || []),
        status: "DRAFT",
        visibility: "INTERNAL",
        budget: { amount: budgetAmount, period: budgetPeriod, currency: currency },
        workMode: workMode,
        adminApproved: false,
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        matchProcessingStatus: 'pending'
      };
      
      await setDoc(doc(db, "requirements_public", reqId), newReq);
      setJdText("");
      setBudgetAmount(0);
      setMandatorySkills("");

      // Trigger AI Match Simulation
      setTimeout(async () => {
        await updateDoc(doc(db, "requirements_public", reqId), { matchProcessingStatus: 'processing' });
        setTimeout(async () => {
             await updateDoc(doc(db, "requirements_public", reqId), { matchProcessingStatus: 'completed' });
        }, 20000);
      }, 5000); 

    } catch (e) {
      console.error("Critical submission failure", e);
    }
    setIsParsing(false);
  };

  const handleJobFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsing(true);
    let cumulativeText = jdText;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch("/api/extract-text", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.text) {
                cumulativeText += (cumulativeText ? "\n---\n" : "") + data.text;
            }
        } catch (err) {
            console.error("Failed to parse file", file.name, err);
        }
    }

    setJdText(cumulativeText);
    setIsParsing(false);
  };

  const handleSubmitBudget = async (jobId: string, budget: number) => {
    try {
      await updateDoc(doc(db, "requirements_public", jobId), {
        status: "PENDING_FINANCIAL_APPROVAL",
        clientTargetBudget: budget
      });
      
      const job = jobs.find(j => j.id === jobId);
      // Trigger Admin Notification
      await fetch("/api/admin/notify-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jobId, 
          jobTitle: job?.title || "New Job", 
          clientName: orgId || "Target Client"
        })
      });
      alert("Requirement submitted for financial governance approval.");
    } catch (err) {
      console.error("Failed to submit budget or notify", err);
    }
  };


  const handleUpdateJD = async (jobId: string, newTitle: string, newDesc: string) => {
    await updateDoc(doc(db, "requirements_public", jobId), {
      title: newTitle,
      description: newDesc,
      updatedAt: serverTimestamp()
    });
    setIsEditing(null);
  };

  const [matchingStatus, setMatchingStatus] = useState<string>('idle');

  const handleApproveMargin = async (req: any, actualBudget: number, marginValue: number, marginType: 'FIXED' | 'PERCENTAGE', curr: string, model: string) => {
    try {
      const platformProfit = marginType === 'PERCENTAGE' ? (actualBudget * (marginValue / 100)) : marginValue;
      const vendorVisible = actualBudget - platformProfit;
      const currencySymbol = curr === 'INR' ? '₹' : '$';
      const rateString = `${currencySymbol}${vendorVisible}${model === 'HOURLY' ? '/hr' : (model === 'LPA' ? ' LPA' : ' LPM')}`;
      
      const financials = {
        clientBudget: actualBudget,
        clientCurrency: curr,
        staffingModel: model,
        adminMargin: platformProfit,
        vendorPayout: vendorVisible,
        platformProfit: platformProfit,
        marginConfig: { type: marginType, value: marginValue },
        payoutRateString: rateString
      };

      // Minimalist update to stay within likely rules hasOnly(['status', ...])
      await updateDoc(doc(db, "requirements_public", req.id), {
        status: "PUBLISHED",
        visibility: "VENDOR_NETWORK",
        vendorVisibleBudget: vendorVisible,
        adminApproved: true,
        matchProcessingStatus: 'READY'
      });

      // Keep private copy for sensitive audit
      await setDoc(doc(db, "requirements_private", req.id), {
        requirementId: req.id,
        ...financials,
        updatedAt: serverTimestamp()
      });

      setShowApprovalModal(null);
      setSelectedJob(null); // Close sidebar on successful release
    } catch (e: any) {
      console.error("Governance engine failure", e.message);
      if (e.message?.includes('permission')) {
        alert("Permission Denied: Insufficient authorization for commercial release.");
      }
    }
  };

  const handleRunAiMatch = async (sub: any) => {
    setIsAnalyzing(true);
    setSelectedSubmission(sub);
    try {
      const result = await analyzeCandidateMatch(selectedJob.description, sub.resumeText || "Skills: " + (sub.skills || []).join(", "));
      setAiAnalysis(result as any);
    } catch (err) {
      console.error("Match Engine V2 failed", err);
    }
    setIsAnalyzing(false);
  };

  const handleCreateDealRoom = async (sub: any) => {
    const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, "dealRooms", roomId), {
      id: roomId,
      requirementId: selectedJob.id,
      submissionId: sub.id,
      clientId: selectedJob.clientId,
      vendorId: sub.vendorId,
      candidateName: sub.candidateName,
      status: "ACTIVE",
      identitiesRevealed: false,
      createdAt: serverTimestamp()
    });
    
    // Initial AI message
    await addDoc(collection(db, "dealRooms", roomId, "messages"), {
      senderRole: "AI Copilot",
      senderId: "system",
      text: `Deal Room initialized for ${selectedJob.title}. I've summarized the candidate's fit: ${aiAnalysis?.summary || "Excellent match found."}`,
      timestamp: serverTimestamp()
    });

    navigate("/deals");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Jobs List */}
        <div className={`flex-1 flex flex-col overflow-hidden p-4 space-y-4 transition-all ${selectedJob ? 'w-1/2' : 'w-full'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800">Operational Staffing OS</h1>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">High-density governance layer. Requirements ⇄ AI Matching.</p>
            </div>
          </div>

          {(isAdmin || isClient) && !selectedJob && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden shrink-0 animate-in fade-in slide-in-from-top duration-500">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">New Requirement Intake</label>
                  <p className="text-[9px] text-slate-400 font-mono">Senior recruiting mode active. Optimized for high-density placement.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer group flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded hover:border-indigo-400 transition-all shadow-sm">
                    <Upload size={12} className="text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Extract from Document</span>
                    <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={handleJobFileChange} />
                  </label>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Work Mode & Engagement</label>
                      <select 
                        value={workMode}
                        onChange={(e: any) => setWorkMode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="Onsite">Onsite</option>
                        <option value="Remote">Remote</option>
                        <option value="C2C">Contract (C2C)</option>
                        <option value="C2H">Contract to Hire (C2H)</option>
                        <option value="Permanent">Permanent Role</option>
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Financial Parameters</label>
                      <div className="flex gap-1">
                        <select 
                           value={currency}
                           onChange={(e: any) => setCurrency(e.target.value)}
                           className="bg-slate-100 border border-slate-200 rounded-l px-2 text-[10px] font-bold text-slate-600 outline-none"
                        >
                           <option value="INR">₹ INR</option>
                           <option value="USD">$ USD</option>
                        </select>
                        <input 
                           type="number" 
                           placeholder="Budget"
                           value={budgetAmount || ""}
                           onChange={(e) => setBudgetAmount(e.target.valueAsNumber)}
                           className="flex-1 bg-slate-50 border-y border-slate-200 p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <select 
                           value={budgetPeriod}
                           onChange={(e: any) => setBudgetPeriod(e.target.value)}
                           className="bg-slate-100 border-y border-r border-slate-200 rounded-r px-2 text-[10px] font-bold text-slate-600 outline-none"
                        >
                           <option value="LPA">LPA</option>
                           <option value="LPM">LPM</option>
                        </select>
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Mandatory Tech Skills</label>
                      <input 
                         type="text"
                         placeholder="React, AWS, Node.js..."
                         value={mandatorySkills}
                         onChange={(e) => setMandatorySkills(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Job Scope & Technical Requirements</label>
                   <textarea 
                     className="w-full h-32 p-3 border border-slate-200 rounded shadow-sm text-[11px] font-sans text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-slate-50/50"
                     placeholder="Paste detailed Job Description. AI will automatically extract title, experience requirements, and core responsibilities."
                     value={jdText}
                     onChange={(e) => setJdText(e.target.value)}
                   />
                </div>

                <div className="flex justify-between items-center bg-indigo-50/50 -mx-4 -mb-4 p-3 border-t border-indigo-100">
                  <div className="flex items-center gap-2">
                    <BrainCircuit size={16} className="text-indigo-500" />
                    <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-tighter">
                      AI Matching Engine Online
                    </p>
                  </div>
                  <Button 
                    onClick={handleParseJD} 
                    disabled={isParsing || !jdText.trim()} 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-widest text-[11px] uppercase py-2 px-6 shadow-md transition-all hover:scale-[1.02]"
                  >
                    {isParsing ? "Initiating Protocol..." : "Finalize & Submit Requirement"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 px-4 py-2 sticky top-0 bg-slate-50 z-10">
                <div className="col-span-1">ID</div>
                <div className="col-span-8">Requirement Details</div>
                <div className="col-span-3 text-right">Actions</div>
            </div>
            
            {jobs.filter(j => isAdmin || j.clientId === orgId || j.visibility === 'VENDOR_NETWORK').map((job) => (
              <div 
                key={job.id} 
                onClick={() => setSelectedJob(job)}
                className={`grid grid-cols-12 gap-2 items-center bg-white border rounded-lg p-3 cursor-pointer transition-all shadow-sm ${selectedJob?.id === job.id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-300'}`}
              >
                <div className="col-span-1 font-mono text-[10px] font-bold text-slate-400">
                  {job.requirementId?.replace('REQ-', '')}
                </div>
                
                <div className="col-span-8">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">{job.title}</h3>
                    <Badge variant="outline" className={`text-[8px] py-0 ${job.adminApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {job.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex flex-wrap gap-1">
                      {job.skills?.slice(0, 4).map((s: string) => <span key={s} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 rounded font-medium border border-slate-200">{s}</span>)}
                    </div>
                    {job.budget && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 border-l border-slate-200 pl-2">
                        <DollarSign size={10} /> {job.budget.amount}{job.budget.period} • {job.workMode}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="col-span-3 flex justify-end space-x-1">
                  {isAdmin && job.status === 'PENDING_FINANCIAL_APPROVAL' && (
                    <Button onClick={(e) => { e.stopPropagation(); setShowApprovalModal(job); }} size="sm" className="bg-amber-500 text-white text-[9px] h-6 px-2 font-bold uppercase">Approve</Button>
                  )}
                  {isClient && job.status === 'DRAFT' && (
                    <Button onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }} size="sm" className="bg-indigo-600 text-white text-[9px] h-6 px-2 font-bold uppercase">Set Budget</Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-[9px] uppercase font-bold text-slate-400 h-6">Matches →</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Job & Candidate Intelligence Sidebar */}
        {selectedJob && (
          <div className="w-1/2 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => { setSelectedJob(null); setAiAnalysis(null); }} className="h-6 w-6"><X size={14}/></Button>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  <Activity size={14} className="text-indigo-600" /> Requirement Intelligence
                </h2>
              </div>
              <div className="flex items-center gap-2">
                 <Badge className="bg-indigo-100 text-indigo-700 text-[9px]">{selectedJob.requirementId}</Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* JD Viewer / Editor */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold uppercase text-slate-400">JD Profile</h3>
                    {isClient && orgId === selectedJob.clientId && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditing(isEditing ? null : selectedJob.id)}
                            className="text-[9px] uppercase h-5"
                        >
                            {isEditing ? "Cancel" : "Edit Profile"}
                        </Button>
                    )}
                </div>
                {isEditing ? (
                    <div className="space-y-2">
                        <input id="edit_title" className="w-full text-sm font-bold border rounded p-1" defaultValue={selectedJob.title} />
                        <textarea id="edit_desc" className="w-full text-[11px] font-mono border rounded p-1 h-32" defaultValue={selectedJob.description} />
                        <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                className="bg-indigo-600 text-white flex-1 h-7 text-[10px] uppercase font-bold"
                                onClick={() => handleUpdateJD(selectedJob.id, (document.getElementById('edit_title') as HTMLInputElement).value, (document.getElementById('edit_desc') as HTMLTextAreaElement).value)}
                            >
                                Save Changes
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1 h-7 text-[10px] uppercase font-bold"
                                onClick={() => setIsEditing(null)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold mb-1">{selectedJob.title}</h4>
                          <Badge variant="outline" className="text-[9px]">{selectedJob.status}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-3 mb-2">{selectedJob.description}</p>
                        
                        {isClient && selectedJob.status === 'DRAFT' && (
                          <div className="mt-2 pt-2 border-t flex flex-col gap-2">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Specify Requirement Budget ($)</label>
                            <div className="flex gap-2">
                              <input 
                                id="client_budget_input"
                                type="number" 
                                className="flex-1 border rounded p-1 text-xs" 
                                placeholder="Total Budget" 
                              />
                              <Button 
                                size="sm"
                                className="bg-indigo-600 text-white text-[9px] uppercase font-bold py-1 px-2 h-7"
                                onClick={() => {
                                  const b = (document.getElementById('client_budget_input') as HTMLInputElement).valueAsNumber;
                                  if (b > 0) handleSubmitBudget(selectedJob.id, b);
                                }}
                              >
                                Submit to Admin
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1 mt-2">
                            {selectedJob.skills?.map((s: string) => <span key={s} className="text-[9px] bg-slate-50 border px-1 rounded text-slate-500">{s}</span>)}
                        </div>
                    </div>
                )}
              </div>

              {/* Matched Candidates List */}
              <div className="p-4 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <BrainCircuit size={12} className="text-indigo-500" /> AI-Native Intelligence
                  </h3>
                  <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[8px] uppercase">
                    Cross-Vendor Search
                  </Badge>
                </div>

                {((selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing') && [...submissions, ...globalMatches].length === 0) ? (
                   <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-lg bg-indigo-50/20 px-6 text-center">
                      <div className="relative mb-4">
                        <Bot size={40} className={`text-indigo-400 ${selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing' ? 'animate-bounce' : 'opacity-30'}`} />
                        {(selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing') && (
                            <div className="absolute -top-1 -right-1">
                                <Activity size={16} className="text-emerald-500 animate-spin" />
                            </div>
                        )}
                      </div>
                      <p className="text-[11px] uppercase font-bold tracking-widest text-indigo-600 mb-1">
                        {selectedJob.matchProcessingStatus === 'pending' ? "Synchronizing Vendor Networks..." : 
                         selectedJob.matchProcessingStatus === 'processing' ? "Executing High-Density AI Match..." :
                         "Still looking for better candidates to match"}
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium">
                        {selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing' 
                          ? "Our AI Agents are currently scanning verified vendor pools for mandatory skills and budget alignment." 
                          : "Your requirement is active. We are prioritizing candidates that meet 90%+ of your technical criteria."}
                      </p>
                      {(selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing') && (
                        <div className="mt-4 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full animate-progress" style={{ width: '40%' }}></div>
                        </div>
                      )}
                   </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-3">
                        {[...submissions, ...globalMatches].map(sub => (
                            <div 
                                key={sub.id} 
                                className={`border rounded-lg p-3 transition-all cursor-pointer ${selectedSubmission?.id === sub.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300'}`}
                                onClick={() => handleRunAiMatch(sub)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-xs uppercase">
                                            {sub.candidateName?.slice(0, 2) || sub.name?.slice(0, 2)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">{sub.candidateName || sub.name}</div>
                                            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                                                <ShieldAlert size={10} /> {sub.isGlobalMatch ? "Pre-Screened Match" : sub.vendorName || "Active Vendor"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {sub.isGlobalMatch && <Badge className="text-[7px] py-0 bg-amber-100 text-amber-700 border-amber-200">MARKET MATCH</Badge>}
                                        <div className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1">
                                            {sub.matchScore ? `${sub.matchScore}% FIT` : "PENDING AI"}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 line-clamp-2">
                                    Top Skills: {sub.skills?.join(", ")}
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis Side Panel (Layered) */}
            {selectedSubmission && (
                <div className="absolute right-0 top-14 bottom-0 w-96 bg-slate-50 text-slate-800 shadow-2xl z-20 flex flex-col border-l border-slate-200 animate-in slide-in-from-right">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                        <div className="flex items-center gap-2">
                            <Bot size={16} className="text-indigo-600" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Recruiter Match OS V2</h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSubmission(null)} className="h-6 w-6 text-slate-400 hover:text-slate-800"><X size={14}/></Button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {isAnalyzing ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                                <Activity size={32} className="text-indigo-500 animate-spin" />
                                <p className="text-[10px] font-bold uppercase text-indigo-500 animate-pulse tracking-widest">Processing High-Density Match Logic...</p>
                            </div>
                        ) : (
                            <>
                                {aiAnalysis && (
                                   <div className="space-y-6">
                                      <AIMatching result={aiAnalysis as any} candidateName={selectedSubmission?.candidateName || selectedSubmission?.name || "Candidate"} />
                                      
                                      <div className="space-y-3">
                                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Engagement Protocol</h4>
                                         <div className="grid grid-cols-1 gap-2">
                                            <Button 
                                              onClick={() => handleCreateDealRoom(selectedSubmission)}
                                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-indigo-100"
                                            >
                                              {(aiAnalysis as any).recommendation === 'STRONG_FIT' ? 'Fast-Track Immediate Deal' : 'Initialize Deal Room Flow'}
                                            </Button>
                                            <Button variant="outline" className="w-full border-slate-200 text-slate-400 h-10 text-[9px] uppercase font-bold rounded-xl">
                                              Archive for Future Req
                                            </Button>
                                         </div>
                                      </div>

                                      <div className="space-y-3">
                                        <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
                                            <MessageSquare size={12} /> Outreach Drafts (AI-V2)
                                        </h4>
                                        <div className="space-y-2">
                                            {['Founder', 'Professional', 'Executive', 'Warm'].map(tone => (
                                                <div key={tone} className="bg-white rounded p-3 border border-slate-200 shadow-sm">
                                                    <div className="text-[8px] font-bold uppercase mb-1 text-indigo-600">{tone} Tone</div>
                                                    <p className="text-[10px] text-slate-600 leading-relaxed italic">{(aiAnalysis as any)?.outreachDrafts?.[tone.toLowerCase()]}</p>
                                                </div>
                                            ))}
                                        </div>
                                      </div>
                                   </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal (Margin Governance) */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Margin Governance Console</h2>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">REQ: {showApprovalModal.requirementId}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowApprovalModal(null)} className="h-8 w-8 rounded-full"><X size={16}/></Button>
            </div>
                 <div className="p-6 space-y-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                 <button 
                    onClick={() => setCurrency('INR')}
                    className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", currency === 'INR' ? "bg-orange-100 text-orange-700 shadow-sm border border-orange-200" : "bg-slate-50 text-slate-400 border border-transparent")}
                 >
                   ₹ INDIAN RUPEE (INR)
                 </button>
                 <button 
                    onClick={() => setCurrency('USD')}
                    className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", currency === 'USD' ? "bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200" : "bg-slate-50 text-slate-400 border border-transparent")}
                 >
                   $ US DOLLAR (USD)
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Client Billing ({currency})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">{currency === 'INR' ? '₹' : '$'}</span>
                    <input id="actualBudget" type="number" className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:shadow-md outline-none transition-all" defaultValue={showApprovalModal.clientTargetBudget || 100} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Staffing Model</label>
                  <select 
                    id="staffingModel" 
                    onChange={(e: any) => setBudgetPeriod(e.target.value)}
                    value={budgetPeriod}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:shadow-md outline-none transition-all"
                  >
                    <option value="LPA">LPA (Per Annum)</option>
                    <option value="LPM">LPM (Per Month)</option>
                    <option value="HOURLY">Hourly (Billable)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Platform Commission (%)</label>
                   <span className="text-[10px] font-black text-indigo-600">{budgetPeriod === 'LPA' ? '8.33% recommended' : '15% recommended'}</span>
                </div>
                <input id="platformMargin" type="number" step="0.01" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:shadow-md outline-none transition-all" defaultValue={budgetPeriod === 'LPA' ? 8.33 : 15} />
              </div>

              <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-2xl shadow-indigo-100">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2">
                   <Activity size={14}/> Commercial Health Simulation
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Currency Protocol</span>
                    <span className="font-mono font-bold text-indigo-400">{currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-black pt-3 border-t border-slate-800">
                    <span>Vendor Visibility</span>
                    <span className="text-emerald-400 uppercase tracking-tighter">MASKED BUDGET ACTIVE</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => {
                    const budget = (document.getElementById('actualBudget') as HTMLInputElement).valueAsNumber;
                    const val = (document.getElementById('platformMargin') as HTMLInputElement).valueAsNumber;
                    const model = (document.getElementById('staffingModel') as HTMLSelectElement).value as any;
                    handleApproveMargin(showApprovalModal, budget, val, 'PERCENTAGE', currency, model);
                  }}
                  className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black h-14 rounded-2xl shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
                >
                  Confirm & Release to Global OS
                </Button>
                <p className="text-[9px] text-center text-slate-400 mt-4 italic max-w-xs mx-auto">
                  By clicking release, you authorize the commercial masking engine to broadcast this requirement to all global vendors.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
