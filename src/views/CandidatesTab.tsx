import { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { AlertTriangle, BrainCircuit, Plus, X, Upload, MapPin, Briefcase } from "lucide-react";
import { Button } from "../lib/Button";
import { db, auth } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, addDoc, getDoc, serverTimestamp, where } from "firebase/firestore";

const STAGES = ["Candidate Added", "Duplicate Review", "Matched", "Client Submission", "Deal Room"];

export default function CandidatesTab() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", linkedin: "", skills: "", resumeText: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const orgId = userDoc.data().organizationId;
          setUserOrgId(orgId);
          
          // Listen to Candidate Pool for this Org
          const q = query(collection(db, "candidatePool"), where("vendorId", "==", orgId));
          const unsubscribe = onSnapshot(q, (snap) => {
            setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          });
          return () => unsubscribe();
        }
      }
    };
    fetchUser();
  }, []);

  const handleAddCandidate = async () => {
    if(!formData.name || !formData.email || !userOrgId) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        vendorId: userOrgId,
        skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean),
        matchScore: 0,
        pipelineStage: "Candidate Added",
        createdAt: serverTimestamp()
      };

      // Call AI for semantic duplicate check & initial matching (Simulation)
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const aiResult = await res.json();

      // Save to Firestore with AI Insights
      const candId = "CAND-" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "candidatePool", candId), {
        ...aiResult,
        candidateId: candId,
        vendorId: userOrgId,
        updatedAt: serverTimestamp()
      });

      setIsSubmitting(false);
      setShowAddForm(false);
      setFormData({ name: "", email: "", phone: "", linkedin: "", skills: "", resumeText: "" });
    } catch (e) {
      console.error("Failed to add candidate", e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full p-4 overflow-hidden space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800">Intelligence Candidate Pool</h1>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Automated screening, duplicate protection, and match orchestration.</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center h-auto py-1.5 px-3">
           <Plus size={14} className="mr-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Add to Pool</span>
        </Button>
      </div>

      <div className="flex-1 flex space-x-4 overflow-x-auto overflow-y-hidden pb-2">
        {STAGES.map(stage => {
          const list = candidates.filter(c => c.pipelineStage === stage);
          return (
            <div key={stage} className={`w-72 flex-shrink-0 bg-slate-50/50 rounded-lg border flex flex-col h-full shadow-sm ${stage === 'Duplicate Review' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
              <div className={`p-3 border-b flex items-center justify-between shrink-0 rounded-t-lg ${stage === 'Duplicate Review' ? 'bg-amber-100/50 border-amber-200' : 'bg-white border-slate-100'}`}>
                <h3 className={`font-bold text-[11px] uppercase tracking-wider ${stage === 'Duplicate Review' ? 'text-amber-800 flex items-center' : 'text-slate-700'}`}>
                  {stage === 'Duplicate Review' && <AlertTriangle size={12} className="mr-1" />}
                  {stage}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${stage === 'Duplicate Review' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{list.length}</span>
              </div>
              
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {list.map(cand => (
                  <div key={cand.id} className={`bg-white border rounded p-3 cursor-pointer hover:shadow-sm transition-all group ${stage === 'Duplicate Review' ? 'border-amber-300 hover:border-amber-400' : 'border-slate-200 hover:border-indigo-300'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-sm text-slate-900 leading-tight group-hover:text-indigo-700">{cand.name}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold font-mono border ${cand.matchScore > 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <BrainCircuit size={10} className="mr-1" />
                        {cand.matchScore}%
                      </span>
                    </div>
                    
                    <div className="text-[10px] text-slate-500 font-mono mb-2 grid grid-cols-2 gap-1">
                      <div className="truncate flex items-center"><MapPin size={10} className="mr-1" /> {cand.location || 'Remote'}</div>
                      <div className="truncate flex items-center"><Briefcase size={10} className="mr-1" /> {cand.id.slice(0, 8)}</div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {cand.skills?.slice(0,3).map((s: string) => (
                        <span key={s} className="text-[9px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono border border-slate-100">
                          {s}
                        </span>
                      ))}
                    </div>
                    
                    {cand.pipelineStage === 'Duplicate Review' && (
                      <div className="mt-2 text-[9px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 p-2 rounded flex flex-col gap-1 items-start">
                         <div className="flex items-center"><AlertTriangle size={12} className="mr-1.5 flex-shrink-0 text-amber-500" /> Duplicate Risk: {cand.duplicateScore}%</div>
                         <div className="text-amber-700 font-mono text-[8px] mt-0.5 uppercase tracking-wide">Ref: {cand.duplicateOf}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">Intelligence Pool Onboarding</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} className="h-6 w-6"><X size={14}/></Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Full Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
                 </div>
              </div>
              <div>
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Skills</label>
                 <input type="text" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="React, Node, AWS" className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Upload size={10} className="mr-1"/> Resume Analysis (Paste Text)</label>
                 <textarea value={formData.resumeText} onChange={e => setFormData({...formData, resumeText: e.target.value})} className="w-full h-32 border border-slate-300 rounded px-2 py-1.5 text-xs font-mono" placeholder="AI will use this for duplicate detection and semantic matching..."></textarea>
              </div>
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
               <Button onClick={handleAddCandidate} disabled={isSubmitting || !formData.name || !formData.email} className="h-8 text-xs font-bold uppercase bg-indigo-600 text-white w-full">
                  {isSubmitting ? "Running Duplicate Prevention..." : "Onboard Candidate"}
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
