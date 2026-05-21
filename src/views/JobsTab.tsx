import React, { useEffect, useState, ChangeEvent } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { Sparkles, FileText, CheckCircle, ShieldAlert, DollarSign, BrainCircuit, MessageSquare, ExternalLink, X, Bot, Activity, Upload, Target, Clock, MapPin, ListChecks, Cpu, Briefcase, Zap, ShieldCheck, Power } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDoc, serverTimestamp, where, addDoc } from "firebase/firestore";
import { logExecutionEvent, ExecutionEventType } from "../lib/infrastructureService";
import { Switch } from "../lib/Switch";
import { analyzeCandidateMatch } from "../services/aiService";
import { AIMatching } from "../components/AIMatching";
import { JDIntelligence } from "../components/JDIntelligence";
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

  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'ops_admin';
  const isClient = userRole === 'client' || userRole?.startsWith('client_');
  const isVendor = userRole === 'vendor' || userRole?.startsWith('vendor_');
  const isRecruiter = userRole === 'recruiter' || userRole?.includes('recruiter');
  const isIndependent = userRole === 'independent' || userRole?.startsWith('independent_') || userRole === 'independent';
  const isSupplyLayer = isVendor || isRecruiter || isIndependent;

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
      const requirementsQuery = isAdmin 
        ? q 
        : (isSupplyLayer 
            ? query(q, where("visibility", "==", "VENDOR_NETWORK"), where("status", "==", "PUBLISHED")) 
            : query(q, where("clientId", "==", orgId)));

      unsubscribe = onSnapshot(requirementsQuery, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setJobs(data.sort((a: any, b: any) => {
           const timeA = a.createdAt?.seconds || new Date(a.createdAt).getTime() / 1000 || 0;
           const timeB = b.createdAt?.seconds || new Date(b.createdAt).getTime() / 1000 || 0;
           return timeB - timeA;
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "requirements_public");
      });
    };

    loadRequirements();
    return () => unsubscribe && unsubscribe();
  }, [orgId, userRole]);

  useEffect(() => {
    if (selectedJob && auth.currentUser) {
      // 1. Listen to explicit vendor submissions
      const qSub = query(collection(db, "submissions"), where("requirementId", "==", selectedJob.id));
      const unsubSub = onSnapshot(qSub, (snap) => {
        setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "submissions");
      });

      // 2. Cross-Vendor Global Matching via Secure API
      const fetchGlobalMatches = async () => {
        try {
          const skills = (selectedJob.skills || []).join(",");
          const res = await fetch(`/api/matching/global?requirementId=${selectedJob.id}&skills=${encodeURIComponent(skills)}`);
          if (res.ok) {
            const data = await res.json();
            setGlobalMatches(data.matches || []);
          }
        } catch (e) {
          console.warn("Global matching API failed, using fallback empty state");
        }
      };

      fetchGlobalMatches();
      return () => unsubSub();
    }
  }, [selectedJob, auth.currentUser]);

  const handleParseJD = async () => {
    if (!jdText.trim()) return;
    setIsParsing(true);
    
    // Heuristic Fallback Title
    const manualTitle = (document.getElementById('new_job_title') as HTMLInputElement)?.value;
    const minExp = (document.getElementById('min_exp') as HTMLInputElement)?.value;
    const maxExp = (document.getElementById('max_exp') as HTMLInputElement)?.value;
    
    const lines = jdText.split("\n").filter(l => l.trim().length > 0);
    const fallbackTitle = manualTitle || (lines.length > 0 ? lines[0].slice(0, 50) : "New Requirement");
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
      
      let initialStatus = "DRAFT";
      let initialVisibility = "INTERNAL";
      let adminApproved = false;
      let financials: any = null;

      if (budgetPeriod === "LPA") {
        // Direct Post: Deduct 8.33% and publish across vendor network immediately
        const platformProfit = Math.round(budgetAmount * 0.0833);
        const vendorVisible = budgetAmount - platformProfit;
        initialStatus = "PUBLISHED";
        initialVisibility = "VENDOR_NETWORK";
        adminApproved = true;
        financials = {
          clientBudget: budgetAmount,
          clientCurrency: currency,
          staffingModel: "Permanent",
          adminMargin: platformProfit,
          vendorPayout: vendorVisible,
          platformProfit: platformProfit,
          marginConfig: { type: "PERCENTAGE", value: 8.33 }
        };
      } else {
        // LPM: Mandatory Admin Approval required
        initialStatus = "PENDING_FINANCIAL_APPROVAL";
        initialVisibility = "INTERNAL";
        adminApproved = false;
      }

      const newReq = {
        requirementId: reqId,
        clientId: orgId || "default-client-org",
        title: manualTitle || parsed.title || fallbackTitle,
        experience: minExp && maxExp ? `${minExp}-${maxExp} Yrs` : (minExp ? `${minExp}+ Yrs` : "Not Specified"),
        minExp: minExp ? parseInt(minExp) : 0,
        maxExp: maxExp ? parseInt(maxExp) : 20,
        description: jdText,
        skills: manualSkills.length > 0 ? manualSkills : (parsed.skills || []),
        status: initialStatus,
        visibility: initialVisibility,
        budget: { amount: budgetAmount, period: budgetPeriod, currency: currency },
        workMode: workMode,
        adminApproved: adminApproved,
        financials: financials,
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        matchProcessingStatus: 'pending'
      };
      
      await setDoc(doc(db, "requirements_public", reqId), newReq);

      // If it requires approval (e.g. LPM), insert into jobApprovalQueue
      if (budgetPeriod !== "LPA") {
        await setDoc(doc(db, "jobApprovalQueue", reqId), {
          jobId: reqId,
          clientId: orgId || "default-client-org",
          title: newReq.title,
          budget: newReq.budget,
          status: "PENDING",
          createdAt: serverTimestamp()
        });

        // Trigger Admin Notification
        try {
          await fetch("/api/admin/notify-approval", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              jobId: reqId, 
              jobTitle: newReq.title, 
              clientName: orgId || "Target Client"
            })
          });
        } catch (notifierError) {
          console.warn("Failed to notify admin hq of pending requirement", notifierError);
        }
      }
      
      // Log Execution Event
      await logExecutionEvent(
        ExecutionEventType.JD_CREATED, 
        reqId, 
        "requirement", 
        { title: newReq.title, organizationId: orgId },
        reqId
      );

      setJdText("");
      setBudgetAmount(0);
      setMandatorySkills("");
      if (document.getElementById('new_job_title')) (document.getElementById('new_job_title') as HTMLInputElement).value = "";
      if (document.getElementById('min_exp')) (document.getElementById('min_exp') as HTMLInputElement).value = "";
      if (document.getElementById('max_exp')) (document.getElementById('max_exp') as HTMLInputElement).value = "";

      // Trigger AI Match Simulation
      setTimeout(async () => {
        await updateDoc(doc(db, "requirements_public", reqId), { 
          matchProcessingStatus: 'processing' 
        });
        
        setTimeout(async () => {
             await updateDoc(doc(db, "requirements_public", reqId), { 
               matchProcessingStatus: 'completed' 
             });
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
      
      const job = jobs.find(j => j.id === jobId || j.requirementId === jobId);
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
      const financials = {
        clientBudget: actualBudget,
        clientCurrency: curr,
        staffingModel: model,
        adminMargin: platformProfit,
        vendorPayout: vendorVisible,
        platformProfit: platformProfit,
        marginConfig: { type: marginType, value: marginValue }
      };

      // 1. USE SECURE API FOR APPROVAL (for HQ logic/metrics)
      const res = await fetch("/api/admin/approve-requirement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reqId: req.id, financials })
      });

      if (!res.ok) throw new Error("Approval API failed");

      // 2. UPDATE REAL FIRESTORE (for real-time consistency)
      await updateDoc(doc(db, "requirements_public", req.id), {
        status: "PUBLISHED",
        visibility: "VENDOR_NETWORK",
        adminApproved: true,
        financials,
        updatedAt: serverTimestamp()
      });

      setShowApprovalModal(null);
      setSelectedJob(null);
      alert("Requirement approved and released to Global OS.");
    } catch (e: any) {
      console.error("Governance engine failure", e.message);
      alert("Governance Error: " + e.message);
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

  const handleToggleStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    try {
      // Attempt direct update first (faster)
      await updateDoc(doc(db, "requirements_public", jobId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.warn("Direct update failed, attempting server proxy...", error.message);
      try {
        const response = await fetch("/api/jobs/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, status: newStatus })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Server proxy update failed");
        }
      } catch (proxyError) {
        console.error("All status update methods failed:", proxyError);
        handleFirestoreError(proxyError, OperationType.UPDATE, `requirements_public/${jobId}`);
      }
    }
  };

  const handleCreateDealRoom = async (sub: any) => {
    const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, "dealRooms", roomId), {
      id: roomId,
      requirementId: selectedJob.id,
      submissionId: sub.id,
      clientId: selectedJob.clientId,
      vendorId: sub.vendorId,
      candidateName: sub.candidateName || sub.name,
      jobTitle: selectedJob.title || "Strategic Role",
      experience: selectedJob.experience || "8+ YRS",
      status: "ACTIVE",
      currentStage: "Interview Scheduled",
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Requirement Title</label>
                      <input 
                         type="text"
                         placeholder="e.g. Senior Backend Engineer"
                         id="new_job_title"
                         className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Urgency Layer</label>
                      <select 
                        id="urgency"
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="NORMAL">Standard Execution</option>
                        <option value="HIGH">High Priority (SLA 48h)</option>
                        <option value="CRITICAL">Critical Path (SLA 24h)</option>
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Exp Range (Yrs)</label>
                      <div className="flex gap-2">
                        <input 
                           type="number" 
                           placeholder="Min"
                           id="min_exp"
                           className="w-1/2 bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none"
                        />
                        <input 
                           type="number" 
                           placeholder="Max"
                           id="max_exp"
                           className="w-1/2 bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none"
                        />
                      </div>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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
            
            {jobs.filter(j => isAdmin || j.clientId === orgId || (j.visibility === 'VENDOR_NETWORK' && j.status === 'PUBLISHED')).map((job) => (
              <div 
                key={job.id} 
                onClick={() => setSelectedJob(job)}
                className={`group relative flex flex-col bg-white border-2 rounded-2xl p-5 cursor-pointer transition-all ${selectedJob?.id === job.id ? 'border-indigo-600 shadow-xl shadow-indigo-50 ring-1 ring-indigo-600' : 'border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-100'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors shadow-sm bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600",
                        selectedJob?.id === job.id && "bg-indigo-600 text-white shadow-indigo-100"
                    )}>
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className={cn(
                          "text-base font-black uppercase tracking-tight leading-none group-hover:text-indigo-600 transition-colors",
                          selectedJob?.id === job.id ? "text-indigo-600" : "text-slate-900"
                      )}>
                        {job.title}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">ID: {job.requirementId?.replace('REQ-', '')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn(
                      "text-[9px] font-black tracking-widest px-2 py-0.5 border-none shadow-sm",
                      job.status === 'PUBLISHED' ? "bg-emerald-100 text-emerald-700" : 
                      job.status === 'PENDING_FINANCIAL_APPROVAL' ? "bg-amber-100 text-amber-700" :
                      job.status === 'DRAFT' ? "bg-slate-100 text-slate-500" : 
                      job.status === 'CLOSED' ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-600"
                    )}>
                      {job.status}
                    </Badge>
                    {(isAdmin || (isClient && job.clientId === orgId)) && (job.status === 'PUBLISHED' || job.status === 'CLOSED') && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{job.status === 'PUBLISHED' ? 'Active' : 'Closed'}</span>
                        <Switch 
                          checked={job.status === 'PUBLISHED'} 
                          onCheckedChange={() => handleToggleStatus(job.id, job.status)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase">
                      <Clock size={12} className="text-slate-300" /> {job.experience}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase border-l pl-4 border-slate-100">
                      <MapPin size={12} className="text-slate-300" /> {job.location || job.workMode}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isAdmin && job.status === 'PENDING_FINANCIAL_APPROVAL' && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); setShowApprovalModal(job); }} 
                        size="sm" 
                        className="bg-amber-500 hover:bg-slate-900 text-white text-[10px] h-8 px-4 font-black uppercase tracking-widest rounded-lg shadow-lg shadow-amber-50"
                      >
                        Approve
                      </Button>
                    )}
                    <div className="flex -space-x-1.5 translate-x-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400 overflow-hidden">
                                <Activity size={10} />
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Job & Candidate Intelligence Sidebar */}
        {selectedJob && 
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

            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-6 max-w-4xl mx-auto pb-24">
                <JDIntelligence job={selectedJob} />
                
                {isClient && selectedJob.status === 'DRAFT' && (
                  <div className="mt-8 p-8 bg-indigo-50 border border-indigo-100 rounded-3xl">
                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900 mb-4">Financial Governance Required</h4>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-indigo-400">Specify Requirement Budget (₹)</label>
                        <div className="flex gap-2">
                          <input 
                            id="client_budget_input"
                            type="number" 
                            className="flex-1 border-2 border-indigo-200 bg-white rounded-xl p-3 text-sm font-bold focus:border-indigo-500 focus:outline-none transition-all" 
                            placeholder="Total Global Budget" 
                          />
                          <Button 
                            size="lg"
                            className="bg-indigo-600 hover:bg-slate-900 text-white text-[11px] uppercase font-black py-4 px-6 h-auto rounded-xl shadow-xl shadow-indigo-100"
                            onClick={() => {
                              const b = (document.getElementById('client_budget_input') as HTMLInputElement).valueAsNumber;
                              if (b > 0) handleSubmitBudget(selectedJob.id, b);
                            }}
                          >
                            Submit for Platform Approval
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Matched Candidates SECTION */}
                  <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group mb-8">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all group-hover:scale-110">
                         <BrainCircuit size={80} />
                      </div>
                      <div className="relative z-10">
                          <div className="text-[9px] font-black uppercase text-indigo-200 tracking-widest mb-4">Orchestration Intelligence</div>
                          <div className="flex items-end gap-2 mb-6">
                              <span className="text-4xl font-black italic">84%</span>
                              <span className="text-[10px] font-black text-indigo-300 uppercase mb-2">Closure Prob.</span>
                          </div>
                          
                          <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                                      <div className="text-[8px] font-black text-indigo-200 uppercase mb-1">Time-to-fill</div>
                                      <div className="text-xs font-black">4.2 Days</div>
                                  </div>
                                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                                      <div className="text-[8px] font-black text-indigo-200 uppercase mb-1">Revenue at Risk</div>
                                      <div className="text-xs font-black text-rose-400">₹4.2L</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex flex-col">
                          <h3 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3 uppercase italic">
                              <Target size={28} className="text-indigo-600" /> 
                              Strategic Routing & High-Density Matches
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-500" /> 
                            Verified Scoring Architecture (70% - 100%)
                          </p>
                        </div>
                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[12px] font-black px-5 py-2.5 rounded-2xl">
                          {([...submissions, ...globalMatches].filter(s => (s.matchScore || 0) >= 70)).length} QUALIFIED PROFILES
                        </Badge>
                      </div>

                  { (selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing') && [...submissions, ...globalMatches].length === 0 ? (
                     <div className="py-24 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-indigo-100 rounded-[40px] bg-indigo-50/20 px-6 text-center">
                        <div className="relative mb-8">
                          <Bot size={80} className={`text-indigo-400 ${selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing' ? 'animate-bounce' : 'opacity-30'}`} />
                          {(selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing') && (
                              <div className="absolute -top-2 -right-2">
                                  <Activity size={32} className="text-emerald-500 animate-spin" />
                              </div>
                          )}
                        </div>
                        <h3 className="text-base font-black uppercase tracking-[0.3em] text-indigo-600 mb-3">
                          {selectedJob.matchProcessingStatus === 'pending' ? "Synchronizing Marketplace..." : 
                           "Executing Neural Match Algorithm..."}
                        </h3>
                        <p className="text-[12px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                          {selectedJob.matchProcessingStatus === 'pending' || selectedJob.matchProcessingStatus === 'processing' 
                            ? "Our AI Agents are currently scanning 14+ verified vendor pools globally for technical skills and budget parity." 
                            : "This requirement is currently undergoing high-fidelity mapping."}
                        </p>
                     </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[...submissions, ...globalMatches]
                        .filter(sub => (sub.matchScore || 0) >= 70 || sub.isGlobalMatch)
                        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                        .map(sub => (
                          <div 
                              key={sub.id} 
                              className={`group relative border-2 rounded-[32px] p-8 transition-all cursor-pointer overflow-hidden ${selectedSubmission?.id === sub.id ? 'border-indigo-600 bg-indigo-50/40 shadow-[0_20px_50px_rgba(79,70,229,0.1)]' : 'border-slate-50 hover:border-indigo-200 hover:shadow-2xl hover:shadow-slate-100 bg-white'}`}
                              onClick={() => handleRunAiMatch(sub)}
                          >
                              <div className="flex justify-between items-start mb-8">
                                  <div className="flex items-center gap-5">
                                      <div className="h-14 w-14 rounded-2xl bg-slate-900 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-base uppercase group-hover:bg-indigo-600 transition-colors">
                                          {sub.candidateName?.slice(0, 2) || sub.name?.slice(0, 2)}
                                      </div>
                                      <div>
                                          <div className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-all uppercase tracking-tight">{sub.candidateName || sub.name}</div>
                                          <div className="text-[11px] text-slate-400 font-bold flex items-center gap-2 mt-1.5 uppercase tracking-widest">
                                              <Target size={14} className="text-slate-300" /> {sub.experience || '8+ YRS'} EXP • {sub.isGlobalMatch ? "Pre-Screened" : sub.vendorName || "Active Vendor"}
                                          </div>
                                      </div>
                                  </div>
                                  <div className={`px-4 py-2 rounded-2xl font-black text-[14px] border shadow-sm ${
                                    (sub.matchScore || 0) >= 90 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                                    'bg-indigo-100 text-indigo-800 border-indigo-200'
                                  }`}>
                                      {sub.matchScore ? `${sub.matchScore}%` : "SYNC"}
                                  </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                  {(sub.skills || []).slice(0, 6).map((s: string) => (
                                    <span key={s} className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                      {s}
                                    </span>
                                  ))}
                                  {(sub.skills || []).length > 6 && (
                                    <span className="text-[10px] font-black text-slate-300 ml-2">+{sub.skills.length - 6} MORE</span>
                                  )}
                              </div>
                          </div>
                      ))}
                      {([...submissions, ...globalMatches].filter(sub => (sub.matchScore || 0) >= 70 || sub.isGlobalMatch)).length === 0 && (
                         <div className="col-span-full py-32 text-center text-slate-400">
                            <Target size={64} className="mx-auto mb-6 opacity-10" />
                            <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-700">No High-Density Matches Found</p>
                            <p className="text-xs font-medium text-indigo-600 mt-2 italic px-8 max-w-md mx-auto leading-relaxed">
                              No matches found at this moment. Please come back and check later, or we will send you a notification as soon as a verified candidate matches your requirements!
                            </p>
                         </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Analysis Side Panel (Layered) */}
            {selectedSubmission && 
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
              }
            </div>
          }
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
