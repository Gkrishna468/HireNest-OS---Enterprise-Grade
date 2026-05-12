import { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { Sparkles, FileText, CheckCircle, ShieldAlert, DollarSign, BrainCircuit, MessageSquare, ExternalLink, X, Bot, Activity } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDoc, serverTimestamp, where, addDoc } from "firebase/firestore";
import { analyzeCandidateMatch, CandidateMatchResult } from "../services/aiService";

export default function JobsTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jdText, setJdText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<CandidateMatchResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  useEffect(() => {
    // Fetch User Role
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
          setOrgId(userDoc.data().organizationId);
        }
      }
    };
    fetchUser();

    // Listen to Requirements
    const q = collection(db, "requirements_public");
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "requirements_public");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      const q = query(collection(db, "submissions"), where("requirementId", "==", selectedJob.id));
      const unsubscribe = onSnapshot(q, (snap) => {
        setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "submissions");
      });
      return () => unsubscribe();
    }
  }, [selectedJob]);

  const handleParseJD = async () => {
    if (!jdText.trim()) return;
    setIsParsing(true);
    try {
      const res = await fetch("/api/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText })
      });
      const parsed = await res.json();
      
      const reqId = "REQ-" + Math.random().toString(36).substr(2, 9);
      const newReq = {
        requirementId: reqId,
        clientId: orgId,
        title: parsed.title,
        description: parsed.description,
        skills: parsed.skills,
        status: "PENDING_FINANCIAL_APPROVAL",
        visibility: "INTERNAL",
        vendorVisibleBudget: 0,
        currency: "USD",
        adminApproved: false,
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "requirements_public", reqId), newReq);
      setJdText("");
    } catch (e) {
      console.error("Failed to parse JD", e);
    }
    setIsParsing(false);
  };

  const handleUpdateJD = async (jobId: string, newTitle: string, newDesc: string) => {
    await updateDoc(doc(db, "requirements_public", jobId), {
      title: newTitle,
      description: newDesc,
      updatedAt: serverTimestamp()
    });
    setIsEditing(null);
  };

  const handleApproveMargin = async (req: any, actualBudget: number, margin: number) => {
    try {
      const vendorVisible = actualBudget - margin;
      await updateDoc(doc(db, "requirements_public", req.id), {
        status: "PUBLISHED",
        visibility: "VENDOR_NETWORK",
        vendorVisibleBudget: vendorVisible,
        adminApproved: true
      });
      await setDoc(doc(db, "requirements_private", req.id), {
        requirementId: req.id,
        actualClientBudget: actualBudget,
        platformMargin: margin,
        marginType: "fixed",
        updatedAt: serverTimestamp()
      });
      setShowApprovalModal(null);
    } catch (e) {
      console.error("Approval failed", e);
    }
  };

  const handleRunAiMatch = async (sub: any) => {
    setIsAnalyzing(true);
    setSelectedSubmission(sub);
    const result = await analyzeCandidateMatch(selectedJob.description, sub.resumeText || "Skills: " + sub.skills?.join(", "));
    setAiAnalysis(result);
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

    alert("Deal Room Created! Redirecting to Deals...");
  };

  const isAdmin = userRole === 'admin';
  const isClient = userRole?.startsWith('client_');

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
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden shrink-0">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Intake New Requirement</label>
              </div>
              <div className="p-3">
                <textarea 
                  className="w-full h-20 p-2 border border-slate-300 rounded shadow-sm text-xs font-mono text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Paste Job Description here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button onClick={handleParseJD} disabled={isParsing || !jdText.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wider text-[10px] uppercase h-auto py-1.5 px-3">
                    {isParsing ? "AI Extraction Active..." : "Parse & Submit"}
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
                    <Badge variant="outline" className="text-[8px] py-0">{job.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {job.skills?.slice(0, 4).map((s: string) => <span key={s} className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">{s}</span>)}
                  </div>
                </div>
                
                <div className="col-span-3 flex justify-end space-x-1">
                  {isAdmin && job.status === 'PENDING_FINANCIAL_APPROVAL' && (
                    <Button onClick={(e) => { e.stopPropagation(); setShowApprovalModal(job); }} size="sm" className="bg-amber-500 text-white text-[9px] h-6 px-2 font-bold uppercase">Approve</Button>
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
                        <h4 className="text-sm font-bold mb-1">{selectedJob.title}</h4>
                        <p className="text-[11px] text-slate-600 line-clamp-3 mb-2">{selectedJob.description}</p>
                        <div className="flex flex-wrap gap-1">
                            {selectedJob.skills?.map((s: string) => <span key={s} className="text-[9px] bg-slate-50 border px-1 rounded text-slate-500">{s}</span>)}
                        </div>
                    </div>
                )}
              </div>

              {/* Matched Candidates List */}
              <div className="p-4 flex-1">
                <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-3 flex items-center gap-1">
                    <BrainCircuit size={12} className="text-indigo-500" /> AI-Native Submissions ({submissions.length})
                </h3>
                {submissions.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 opacity-50 border border-dashed rounded-lg">
                        <Bot size={32} className="mb-2" />
                        <p className="text-xs uppercase font-bold tracking-widest">Awaiting Vendor Units</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map(sub => (
                            <div 
                                key={sub.id} 
                                className={`border rounded-lg p-3 transition-all cursor-pointer ${selectedSubmission?.id === sub.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300'}`}
                                onClick={() => handleRunAiMatch(sub)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                            {sub.candidateName?.slice(0, 2)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">{sub.candidateName}</div>
                                            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                                                <ShieldAlert size={10} /> {sub.vendorName || "Active Vendor"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200">
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
                )}
              </div>
            </div>

            {/* AI Analysis Side Panel (Layered) */}
            {selectedSubmission && (
                <div className="absolute right-0 top-14 bottom-0 w-80 bg-slate-900 text-white shadow-2xl z-20 flex flex-col border-l border-slate-700 animate-in slide-in-from-right">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot size={16} className="text-indigo-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300">AI Analysis Flow</h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSubmission(null)} className="h-6 w-6 text-slate-500 hover:text-white"><X size={14}/></Button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        {isAnalyzing ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                                <Activity size={32} className="text-indigo-500 animate-spin" />
                                <p className="text-[10px] font-bold uppercase text-indigo-300 animate-pulse tracking-widest">Synchronizing Matched Logic...</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Match Summary</h4>
                                    <div className="bg-slate-800 border border-slate-700 rounded p-3 text-[11px] text-slate-300 leading-relaxed italic">
                                        "{aiAnalysis?.summary}"
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Strengths</h4>
                                        <ul className="text-[10px] space-y-1">
                                            {aiAnalysis?.strengths.map(s => <li key={s} className="flex gap-2"><span>+</span> {s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] uppercase font-bold text-amber-500 tracking-widest">Gaps</h4>
                                        <ul className="text-[10px] space-y-1">
                                            {aiAnalysis?.gaps.map(g => <li key={g} className="flex gap-2"><span>-</span> {g}</li>)}
                                        </ul>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
                                        <MessageSquare size={12} /> Multi-Tone Outreach Drafts
                                    </h4>
                                    <div className="space-y-2">
                                        {['Founder', 'Professional', 'Executive', 'Warm'].map(tone => (
                                            <div key={tone} className="bg-slate-800 rounded p-2 border border-slate-750">
                                                <div className="text-[8px] font-bold uppercase mb-1 text-slate-500">{tone} Tone</div>
                                                <p className="text-[9px] text-slate-400 line-clamp-2">{(aiAnalysis?.outreachDrafts as any)?.[tone.toLowerCase()]}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800">
                                    <Button 
                                        onClick={() => handleCreateDealRoom(selectedSubmission)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 text-[10px] uppercase tracking-widest"
                                    >
                                        Collaborate & Open Deal Room
                                    </Button>
                                    <p className="text-[8px] text-slate-500 mt-2 text-center">Identity revealing requires Admin approval after MSA/NDA validation.</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal (Existing) */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">Margin Control</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowApprovalModal(null)}>×</Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Actual Client Budget ($)</label>
                <input id="actualBudget" type="number" className="w-full p-2 border border-slate-200 rounded text-sm mt-1" defaultValue={100} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Platform Margin ($)</label>
                <input id="platformMargin" type="number" className="w-full p-2 border border-slate-200 rounded text-sm mt-1" defaultValue={10} />
              </div>
              <Button 
                onClick={() => {
                  const budget = (document.getElementById('actualBudget') as HTMLInputElement).valueAsNumber;
                  const margin = (document.getElementById('platformMargin') as HTMLInputElement).valueAsNumber;
                  handleApproveMargin(showApprovalModal, budget, margin);
                }}
                className="w-full bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg"
              >
                Approve & Publish to Marketplace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
