import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { Badge } from "../../lib/Badge";
import { CheckCircle, Bot, User, Presentation, Activity } from "lucide-react";
import Candidate360Modal from "../../components/modals/Candidate360Modal";

export default function ClientCandidateWorkspace({ userOrgId, userRole }: { userOrgId: string; userRole: string }) {
  const [activeTab, setActiveTab] = useState<"MATCHED" | "SUBMITTED" | "INTERVIEWS">("MATCHED");
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [reqs, setReqs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userOrgId) return;

    setLoading(true);

    // Fetch AI Matches via API (cross-collection)
    fetch(`/api/client-ai-matches?orgId=${userOrgId}`)
      .then(res => res.json())
      .then(data => setAiMatches(data.matches || []))
      .catch(console.error);

    // Requirements Mapping
    const qReq = query(collection(db, "requirements_public"), where("clientId", "==", userOrgId));
    const unsubReq = onSnapshot(qReq, snap => {
      const map: Record<string, string> = {};
      snap.forEach(d => { map[d.id] = d.data().title || d.data().jobTitle || "Open Requirement"; });
      setReqs(map);
    });

    // Submissions List
    const qSub = query(collection(db, "submissions"), where("clientId", "==", userOrgId));
    const unsubSub = onSnapshot(qSub, snap => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Interviews List
    const qInt = query(collection(db, "interviews"), where("clientId", "==", userOrgId));
    const unsubInt = onSnapshot(qInt, snap => {
      setInterviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    setLoading(false);

    return () => {
      unsubReq();
      unsubSub();
      unsubInt();
    };
  }, [userOrgId]);

  return (
    <div className="flex bg-slate-50 relative min-h-screen">
      <div className="p-8 pb-32 flex-1 max-w-7xl mx-auto w-full overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Candidates</h1>
            <p className="text-slate-500 mt-1">Review matches, submissions, and active interviews.</p>
          </div>
        </div>

        {/* Workspace Tabs */}
        <div className="flex space-x-6 border-b border-slate-200 mb-8">
          <button
            onClick={() => setActiveTab("MATCHED")}
            className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === "MATCHED" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><Bot size={16} /> Matched {aiMatches.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{aiMatches.length}</span>}</span>
            {activeTab === "MATCHED" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("SUBMITTED")}
            className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === "SUBMITTED" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><Presentation size={16} /> Submitted {submissions.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{submissions.length}</span>}</span>
            {activeTab === "SUBMITTED" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("INTERVIEWS")}
            className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === "INTERVIEWS" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><Activity size={16} /> Interviews {interviews.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{interviews.length}</span>}</span>
            {activeTab === "INTERVIEWS" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
        </div>

        {activeTab === "MATCHED" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {aiMatches.length === 0 ? <p className="text-slate-500 col-span-full">No AI matched candidates found.</p> : 
              aiMatches.map(match => (
                <div
                  key={match.id}
                  className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                  onClick={() => setSelectedCandidate(match)}
                >
                   <div className="p-4 border-b border-slate-100 bg-slate-50">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Matched To</div>
                     <div className="font-semibold text-sm text-slate-700 line-clamp-1">{match.reqTitle || "Requirement Match"}</div>
                   </div>
                   <div className="p-5 flex-1">
                     <h3 className="font-bold text-lg text-slate-900 border-b border-transparent group-hover:border-indigo-200 transition-colors w-max">{match.name || match.candidateName || "Candidate"}</h3>
                     <Badge variant="outline" className="mt-2 w-max text-indigo-600 border-indigo-200 bg-indigo-50">Match Score: {match.matchScore || match.score || "--"}%</Badge>
                     <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed">{match.summary || match.aiAnalysis || "Match discovered by Strategic Engine."}</p>
                   </div>
                   <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                     <div className="text-[10px] font-bold text-slate-400">{match.vendorName || "Active Vendor"}</div>
                     <div className="text-xs font-bold text-indigo-600">Review Candidate &rarr;</div>
                   </div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === "SUBMITTED" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {submissions.length === 0 ? <p className="text-slate-500 col-span-full">No submitted candidates found.</p> : 
              submissions.map(sub => (
                <div
                  key={sub.id}
                  className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                  onClick={() => setSelectedCandidate({ ...sub, id: sub.candidateId, isSubmission: true })}
                >
                   <div className="p-4 border-b border-slate-100 bg-slate-50">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Matched To</div>
                     <div className="font-semibold text-sm text-slate-700 line-clamp-1">{reqs[sub.requirementId] || sub.reqTitle || "Requirement Context"}</div>
                     <div className="text-[10px] font-mono text-slate-400 mt-0.5">{sub.requirementId || "ID Unknown"}</div>
                   </div>
                   <div className="p-5 flex-1 space-y-3">
                     <h3 className="font-bold text-lg text-slate-900 border-b border-transparent group-hover:border-indigo-200 transition-colors w-max line-clamp-1">{sub.candidateName || "Submitted Candidate"}</h3>
                     <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">{sub.matchScore || "--"}% Match</Badge>
                        <Badge variant="success">{sub.status || "PENDING_REVIEW"}</Badge>
                     </div>
                   </div>
                   <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                     <div className="text-[10px] font-bold text-slate-400 max-w-[120px] truncate">Vendor: {sub.vendorId || "Unknown"}</div>
                     <div className="text-xs font-bold text-indigo-600">Review &rarr;</div>
                   </div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === "INTERVIEWS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {interviews.length === 0 ? <p className="text-slate-500 col-span-full">No active interviews found.</p> : 
              interviews.map(int => (
                <div
                  key={int.id}
                  className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                >
                   <div className="p-4 border-b border-slate-100 bg-slate-50">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Matched To</div>
                     <div className="font-semibold text-sm text-slate-700 line-clamp-1">{reqs[int.requirementId] || int.reqTitle || "Requirement Context"}</div>
                     <div className="text-[10px] font-mono text-slate-400 mt-0.5">{int.requirementId || "ID Unknown"}</div>
                   </div>
                   <div className="p-5 flex-1 space-y-3">
                     <h3 className="font-bold text-lg text-slate-900 border-b border-transparent group-hover:border-indigo-200 transition-colors w-max line-clamp-1">{int.candidateName || "Interviewing Candidate"}</h3>
                     <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Round {int.roundNumber || 1}</Badge>
                        <Badge variant="success">{int.status || "SCHEDULED"}</Badge>
                     </div>
                   </div>
                   <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                     <div className="text-[10px] font-bold text-slate-400 max-w-[120px] truncate">Vendor: {int.vendorId || "Unknown"}</div>
                     <div className="text-xs font-bold text-indigo-600">Enter Deal Room &rarr;</div>
                   </div>
                </div>
              ))
            }
          </div>
        )}

      </div>
      
      {selectedCandidate && (
        <Candidate360Modal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          isAdmin={false}
          userOrgId={userOrgId}
          userRole={userRole}
          isClientReviewMode={true}
        />
      )}
    </div>
  );
}
