import { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { Sparkles, FileText, CheckCircle, ShieldAlert, DollarSign } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default function JobsTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jdText, setJdText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<any>(null);

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
    });
    return () => unsubscribe();
  }, []);

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
      
      // Create Requirement in Firestore
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

  const handleApproveMargin = async (req: any, actualBudget: number, margin: number) => {
    try {
      const vendorVisible = actualBudget - margin;
      
      // Update Requirement (Public)
      await updateDoc(doc(db, "requirements_public", req.id), {
        status: "PUBLISHED",
        visibility: "VENDOR_NETWORK",
        vendorVisibleBudget: vendorVisible,
        adminApproved: true
      });
      
      // Set Financials (Private)
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

  const isAdmin = userRole === 'admin';
  const isClient = userRole?.startsWith('client_');

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800">HireNest OS Operations</h1>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Hierarchical Operational Layer — Governance, Staffing & Marketplace.</p>
        </div>
      </div>

      {(isAdmin || isClient) && (
        <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Intake New Requirement</label>
          </div>
          <div className="p-3">
            <textarea 
              className="w-full h-24 p-2 border border-slate-300 rounded shadow-sm text-xs font-mono text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Paste Job Description here... AI will extract skills and prepare for governance layer."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={handleParseJD} disabled={isParsing || !jdText.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wider text-[10px] uppercase h-auto py-1.5 px-3">
                {isParsing ? (
                  <span className="flex items-center"><span className="animate-pulse mr-1">✦</span> Intelligence Layer Active...</span>
                ) : (
                  <span className="flex items-center"><Sparkles size={12} className="mr-1" /> Parse & Submit</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 px-4 py-2 border-b border-slate-200 shrink-0">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Role & Status</div>
            <div className="col-span-4">Governance & Marketplace</div>
            <div className="col-span-3 text-right">Actions</div>
        </div>
        
        {jobs.map((job) => (
          <div key={job.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors shadow-sm">
            <div className="col-span-1 font-mono text-[11px] font-bold text-indigo-600 flex items-center">
              <FileText size={12} className="mr-1 text-slate-400" /> {job.requirementId?.replace('REQ-', '') || job.id.slice(0,4)}
            </div>
            
            <div className="col-span-4 pr-4">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-bold text-slate-900 truncate">{job.title}</h3>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                  job.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                  job.status === 'PENDING_FINANCIAL_APPROVAL' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                  'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {job.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-3">
                <span className="flex items-center"><Badge variant="outline" className="text-[8px] py-0 px-1">{job.visibility}</Badge></span>
                {job.vendorVisibleBudget > 0 && <span className="flex items-center font-bold text-indigo-600"><DollarSign size={10} />{job.vendorVisibleBudget}/{job.currency}</span>}
              </div>
            </div>
            
            <div className="col-span-4 flex flex-wrap gap-1.5 h-full content-start italic text-[10px] text-slate-400">
               {job.skills?.slice(0, 5).map((s: string) => (
                 <span key={s} className="bg-slate-50 px-1 border border-slate-100 rounded text-slate-500">{s}</span>
               ))}
            </div>
            
            <div className="col-span-3 flex justify-end space-x-2">
              {isAdmin && job.status === 'PENDING_FINANCIAL_APPROVAL' && (
                <Button 
                  onClick={() => setShowApprovalModal(job)}
                  size="sm" 
                  className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold uppercase h-auto py-1 px-2"
                >
                  <ShieldAlert size={12} className="mr-1" /> Governance
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-wider h-auto py-1.5 px-3 border-slate-300 text-slate-600 hover:bg-slate-100">
                Details
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Basic Approval Modal Mock (Admin only) */}
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
