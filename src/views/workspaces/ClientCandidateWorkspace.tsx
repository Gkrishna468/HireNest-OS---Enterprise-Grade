import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { Badge } from "../../lib/Badge";
import { CheckCircle, Target, User, Presentation, Activity } from "lucide-react";
import Candidate360Modal from "../../components/modals/Candidate360Modal";
import { InterviewSchedulerModal } from "../../components/modals/InterviewSchedulerModal";

export default function ClientCandidateWorkspace({ userOrgId, userRole }: { userOrgId: string; userRole: string }) {
  const [activeTab, setActiveTab] = useState<"SUBMITTED" | "SHORTLISTED" | "INTERVIEWS" | "OFFERS" | "PLACED">("SUBMITTED");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [schedulingSubmission, setSchedulingSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [reqs, setReqs] = useState<Record<string, string>>({});

  const handleShortlist = async (candidate: any) => {
    if (!candidate.submissionId) return alert("Cannot shortlist - missing submission context. Was this from AI Matches?");
    try {
      await updateDoc(doc(db, "submissions", candidate.submissionId), {
        status: "SHORTLISTED",
        updatedAt: serverTimestamp()
      });
      alert("Candidate shortlisted successfully.");
      setSelectedCandidate(null);
    } catch (e) {
      console.error(e);
      alert("Error shortlisting candidate.");
    }
  };

  const handleReject = async (candidate: any) => {
    if (!candidate.submissionId) return alert("Cannot reject - missing submission context.");
    const reason = window.prompt("Rejection reason (e.g. Missing Skills, Experience Gap):");
    if (!reason) return;
    try {
      await updateDoc(doc(db, "submissions", candidate.submissionId), {
        status: "REJECTED",
        rejectReason: reason,
        updatedAt: serverTimestamp()
      });
      alert("Candidate rejected.");
      setSelectedCandidate(null);
    } catch (e) {
      console.error(e);
      alert("Error rejecting candidate.");
    }
  };

  const handleOpenDealRoom = async (candidate: any) => {
    if (!candidate.submissionId) return alert("Cannot open deal room - missing submission context.");
    try {
      if (candidate.dealRoomId) {
         window.location.href = "/deal-rooms"; 
      } else {
         const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
         await addDoc(collection(db, "dealRooms"), {
           id: roomId,
           requirementId: candidate.requirementId || "",
           candidateId: candidate.candidateId || candidate.id,
           vendorId: candidate.vendorId || "Unknown",
           clientId: userOrgId,
           clientName: 'Client',
           vendorName: candidate.vendorName || 'Vendor',
           candidateName: candidate.candidateName || candidate.name || 'Anonymous',
           jobTitle: candidate.reqTitle || reqs[candidate.requirementId] || "Strategic Role",
           experience: candidate.experience || "Not Specified",
           status: "ACTIVE",
           currentStage: "clarification",
           identitiesRevealed: false,
           createdAt: serverTimestamp(),
           matchData: { matchScore: candidate.matchScore || 0 }
         });
         await updateDoc(doc(db, "submissions", candidate.submissionId), {
           dealRoomId: roomId,
           updatedAt: serverTimestamp()
         });
         alert("Clarification thread (Deal Room) created successfully.");
         setSelectedCandidate(null);
      }
    } catch (e) {
       console.error(e);
       alert("Error creating Deal Room.");
    }
  };

  const handleOffer = async (candidate: any) => {
    if (!candidate.submissionId) return alert("Cannot offer - missing submission context.");
    try {
      await updateDoc(doc(db, "submissions", candidate.submissionId), {
        status: "OFFER_DRAFTED",
        updatedAt: serverTimestamp()
      });
      alert("Candidate moved to Offer stage.");
      setSelectedCandidate(null);
    } catch (e) {
      console.error(e);
      alert("Error offering candidate.");
    }
  };

  useEffect(() => {
    if (!userOrgId) return;

    setLoading(true);

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
      const allSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allowedSubs = allSubs.filter(s => {
         const st = s.status || "PENDING_REVIEW";
         return !['DELETED', 'ARCHIVED', 'PARSING', 'DRAFT', 'MATCHED', 'ADDED'].includes(st);
      });
      setSubmissions(allowedSubs);
    });

    // Interviews List
    fetch(`/api/interviews?clientId=${userOrgId}`)
       .then(res => res.json())
       .then(data => {
          if (data.interviews) {
             setInterviews(data.interviews);
          }
       })
       .catch(err => console.warn("Failed to fetch interviews", err));

    setLoading(false);

    return () => {
      unsubReq();
      unsubSub();
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
        <div className="flex space-x-6 border-b border-slate-200 mb-8 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("SUBMITTED")}
            className={`pb-3 font-semibold text-sm transition-colors relative whitespace-nowrap ${activeTab === "SUBMITTED" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><Presentation size={16} /> Submitted {submissions.filter(s => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED').length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{submissions.filter(s => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED').length}</span>}</span>
            {activeTab === "SUBMITTED" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("SHORTLISTED")}
            className={`pb-3 font-semibold text-sm transition-colors relative whitespace-nowrap ${activeTab === "SHORTLISTED" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><CheckCircle size={16} /> Shortlisted {submissions.filter(s => s.status === 'SHORTLISTED').length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{submissions.filter(s => s.status === 'SHORTLISTED').length}</span>}</span>
            {activeTab === "SHORTLISTED" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("INTERVIEWS")}
            className={`pb-3 font-semibold text-sm transition-colors relative whitespace-nowrap ${activeTab === "INTERVIEWS" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><Activity size={16} /> Interviews {submissions.filter(s => s.status?.includes('INTERVIEW')).length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{submissions.filter(s => s.status?.includes('INTERVIEW')).length}</span>}</span>
            {activeTab === "INTERVIEWS" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("OFFERS")}
            className={`pb-3 font-semibold text-sm transition-colors relative whitespace-nowrap ${activeTab === "OFFERS" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><Target size={16} /> Offers {submissions.filter(s => s.status?.includes('OFFER')).length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{submissions.filter(s => s.status?.includes('OFFER')).length}</span>}</span>
            {activeTab === "OFFERS" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("PLACED")}
            className={`pb-3 font-semibold text-sm transition-colors relative whitespace-nowrap ${activeTab === "PLACED" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
          >
            <span className="flex items-center gap-2"><CheckCircle size={16} /> Placed {submissions.filter(s => s.status === 'PLACED' || s.status === 'JOINED').length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{submissions.filter(s => s.status === 'PLACED' || s.status === 'JOINED').length}</span>}</span>
            {activeTab === "PLACED" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
        </div>

        {activeTab === "SUBMITTED" && (() => {
           const list = submissions.filter(s => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED');
           return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {list.length === 0 ? <p className="text-slate-500 col-span-full">No submitted candidates found.</p> : 
                 list.map(sub => (
                   <div
                     key={sub.id}
                     className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                     onClick={() => setSelectedCandidate({ ...sub, id: sub.candidateId, isSubmission: true, submissionId: sub.id })}
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
           );
        })()}

        {activeTab === "SHORTLISTED" && (() => {
           const list = submissions.filter(s => s.status === 'SHORTLISTED');
           return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {list.length === 0 ? <p className="text-slate-500 col-span-full">No shortlisted candidates found.</p> : 
                 list.map(sub => (
                   <div
                     key={sub.id}
                     className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-emerald-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                     onClick={() => setSelectedCandidate({ ...sub, id: sub.candidateId, isSubmission: true, submissionId: sub.id })}
                   >
                      <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Matched To</div>
                        <div className="font-semibold text-sm text-slate-700 line-clamp-1">{reqs[sub.requirementId] || sub.reqTitle || "Requirement Context"}</div>
                      </div>
                      <div className="p-5 flex-1 space-y-3">
                        <h3 className="font-bold text-lg text-slate-900 border-b border-transparent group-hover:border-emerald-200 transition-colors w-max line-clamp-1">{sub.candidateName || "Shortlisted Candidate"}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                           <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Shortlisted</Badge>
                        </div>
                      </div>
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="text-[10px] font-bold text-slate-400 max-w-[120px] truncate">Vendor: {sub.vendorId || "Unknown"}</div>
                        <div className="text-xs font-bold text-emerald-600">Request Interview &rarr;</div>
                      </div>
                   </div>
                 ))
               }
             </div>
           );
        })()}

        {activeTab === "INTERVIEWS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {interviews.length === 0 ? <p className="text-slate-500 col-span-full">No active interviews found.</p> : 
              interviews.map(int => (
                <div
                  key={int.id}
                  className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                  onClick={() => {
                     const sub = submissions.find(s => s.id === int.submissionId);
                     if (sub) {
                        setSelectedCandidate({ ...sub, id: sub.candidateId, isSubmission: true, submissionId: sub.id });
                     } else {
                        setSelectedCandidate({ ...int, id: int.candidateId, isSubmission: true, submissionId: int.submissionId });
                     }
                  }}
                >
                   <div className="p-4 border-b border-slate-100 bg-slate-50">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Matched To</div>
                     <div className="font-semibold text-sm text-slate-700 line-clamp-1">{reqs[int.requirementId] || int.reqTitle || "Requirement Context"}</div>
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
                     <div className="text-xs font-bold text-indigo-600">Review Candidate &rarr;</div>
                   </div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === "OFFERS" && (() => {
           const list = submissions.filter(s => s.status?.includes('OFFER'));
           return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {list.length === 0 ? <p className="text-slate-500 col-span-full">No candidates in offer stage.</p> : 
                 list.map(sub => (
                   <div
                     key={sub.id}
                     className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                     onClick={() => setSelectedCandidate({ ...sub, id: sub.candidateId, isSubmission: true, submissionId: sub.id })}
                   >
                      <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <div className="font-semibold text-sm text-slate-700 line-clamp-1">{reqs[sub.requirementId] || sub.reqTitle || "Requirement Context"}</div>
                      </div>
                      <div className="p-5 flex-1 space-y-3">
                        <h3 className="font-bold text-lg text-slate-900 border-b border-transparent group-hover:border-indigo-200 transition-colors w-max line-clamp-1">{sub.candidateName || "Candidate"}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                           <Badge variant="success">{sub.status || "OFFER"}</Badge>
                        </div>
                      </div>
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="text-[10px] font-bold text-slate-400 max-w-[120px] truncate">Vendor: {sub.vendorId || "Unknown"}</div>
                        <div className="text-xs font-bold text-indigo-600">Review Details &rarr;</div>
                      </div>
                   </div>
                 ))
               }
             </div>
           );
        })()}

        {activeTab === "PLACED" && (() => {
           const list = submissions.filter(s => s.status === 'PLACED' || s.status === 'JOINED');
           return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {list.length === 0 ? <p className="text-slate-500 col-span-full">No placed candidates.</p> : 
                 list.map(sub => (
                   <div
                     key={sub.id}
                     className="bg-white rounded-xl border border-slate-200 flex flex-col hover:border-indigo-300 transition-all cursor-pointer shadow-sm overflow-hidden"
                     onClick={() => setSelectedCandidate({ ...sub, id: sub.candidateId, isSubmission: true, submissionId: sub.id })}
                   >
                      <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <div className="font-semibold text-sm text-slate-700 line-clamp-1">{reqs[sub.requirementId] || sub.reqTitle || "Requirement Context"}</div>
                      </div>
                      <div className="p-5 flex-1 space-y-3">
                        <h3 className="font-bold text-lg text-slate-900 border-b border-transparent group-hover:border-indigo-200 transition-colors w-max line-clamp-1">{sub.candidateName || "Candidate"}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                           <Badge variant="success">{sub.status || "PLACED"}</Badge>
                        </div>
                      </div>
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="text-[10px] font-bold text-slate-400 max-w-[120px] truncate">Vendor: {sub.vendorId || "Unknown"}</div>
                        <div className="text-xs font-bold text-indigo-600">Review Candidate &rarr;</div>
                      </div>
                   </div>
                 ))
               }
             </div>
           );
        })()}

      </div>
      
      {selectedCandidate && (
        <Candidate360Modal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          isAdmin={false}
          userOrgId={userOrgId}
          userRole={userRole}
          isClientReviewMode={true}
          onShortlist={() => handleShortlist(selectedCandidate)}
          onReject={() => handleReject(selectedCandidate)}
          onSchedule={() => {
            setSchedulingSubmission(selectedCandidate);
            setSelectedCandidate(null);
          }}
          onRequestClarification={() => handleOpenDealRoom(selectedCandidate)}
          onOffer={() => handleOffer(selectedCandidate)}
        />
      )}

      {schedulingSubmission && (
        <InterviewSchedulerModal
          submission={schedulingSubmission}
          requirement={{ id: schedulingSubmission.requirementId, title: reqs[schedulingSubmission.requirementId] || schedulingSubmission.reqTitle }}
          isClientAction={true}
          onClose={() => setSchedulingSubmission(null)}
        />
      )}
    </div>
  );
}
