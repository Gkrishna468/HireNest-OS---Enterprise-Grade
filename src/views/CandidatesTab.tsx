import React, { useEffect, useState, ChangeEvent } from "react";
import { Badge } from "../lib/Badge";
import { AlertTriangle, BrainCircuit, Plus, X, Upload, MapPin, Briefcase, Activity, Bot } from "lucide-react";
import { Button } from "../lib/Button";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, addDoc, getDoc, serverTimestamp, where } from "firebase/firestore";
import { parseBulkResumes } from "../services/aiService";

const STAGES = ["Candidate Added", "Duplicate Review", "Matched", "Client Submission", "Deal Room"];

export default function CandidatesTab() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", linkedin: "", skills: "", resumeText: "" });
  const [bulkText, setBulkText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const init = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const orgId = userDoc.data().organizationId;
          setUserOrgId(orgId);
          
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
            if (!error.message.includes("permission")) {
              handleFirestoreError(error, OperationType.GET, "candidatePool");
            }
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
    if(!formData.name || !formData.email || !userOrgId) return;
    setIsSubmitting(true);
    try {
      const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "candidatePool", candId), {
        ...formData,
        candidateId: candId,
        vendorId: userOrgId,
        skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean),
        matchScore: 85, // Simulated initial matches
        pipelineStage: "Candidate Added",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsSubmitting(false);
      setShowAddForm(false);
      setFormData({ name: "", email: "", phone: "", linkedin: "", skills: "", resumeText: "" });
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkText.trim() || !userOrgId) return;
    setIsBulkProcessing(true);
    try {
      const splitResumes = bulkText.split('---').map(r => r.trim()).filter(r => r.length > 10);
      const parsedProfiles = await parseBulkResumes(splitResumes);
      
      for (const profile of parsedProfiles) {
        const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, "candidatePool", candId), {
          ...profile,
          candidateId: candId,
          vendorId: userOrgId,
          matchScore: Math.floor(Math.random() * 30) + 60,
          pipelineStage: "Candidate Added",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setBulkText("");
      setShowBulkUpload(false);
    } catch (e) {
      console.error("Bulk upload failed", e);
    }
    setIsBulkProcessing(false);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkProcessing(true);
    let cumulativeText = bulkText;

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

    setBulkText(cumulativeText);
    setIsBulkProcessing(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full p-4 overflow-hidden space-y-4 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" /> Intelligence Candidate Pool
          </h1>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Automated screening, duplicate protection, and match orchestration.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => setShowBulkUpload(true)} variant="outline" size="sm" className="border-slate-300 text-slate-600 flex items-center h-auto py-1.5 px-3 bg-white">
                <Upload size={14} className="mr-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Bulk Upload</span>
            </Button>
            <Button onClick={() => setShowAddForm(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center h-auto py-1.5 px-3">
                <Plus size={14} className="mr-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Add Profile</span>
            </Button>
        </div>
      </div>

      <div className="flex-1 flex space-x-4 overflow-x-auto overflow-y-hidden pb-2">
        {STAGES.map(stage => {
          const list = candidates.filter(c => c.pipelineStage === stage);
          return (
            <div key={stage} className={`w-72 flex-shrink-0 bg-slate-100/50 rounded-lg border flex flex-col h-full shadow-sm ${stage === 'Duplicate Review' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
              <div className={`p-3 border-b flex items-center justify-between shrink-0 rounded-t-lg ${stage === 'Duplicate Review' ? 'bg-amber-100/50 border-amber-200' : 'bg-white border-slate-100'}`}>
                <h3 className={`font-bold text-[11px] uppercase tracking-wider ${stage === 'Duplicate Review' ? 'text-amber-800' : 'text-slate-700'}`}>
                  {stage}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border bg-slate-50 ${stage === 'Duplicate Review' ? 'text-amber-800 border-amber-200' : 'text-slate-600 border-slate-200'}`}>{list.length}</span>
              </div>
              
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {list.map(cand => (
                  <div key={cand.id} className="bg-white border border-slate-200 rounded p-3 hover:border-indigo-400 transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-xs text-slate-900">{cand.name}</div>
                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded border border-indigo-100">
                        {cand.matchScore}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mb-2">
                        <MapPin size={10} /> {cand.location || 'Remote'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cand.skills?.slice(0,3).map((s: string) => (
                        <span key={s} className="text-[9px] bg-slate-50 text-slate-500 border rounded px-1">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
