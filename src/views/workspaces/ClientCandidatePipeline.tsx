import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, Filter } from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { CandidateReviewModal } from '../../components/modals/CandidateReviewModal';
import { InterviewSchedulerModal } from '../../components/modals/InterviewSchedulerModal';

export function ClientCandidatePipeline({ orgId, userRole, onCandidateClick }: { orgId: string, userRole: string | null, onCandidateClick?: (c: any) => void }) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [reviewData, setReviewData] = useState<{sub: any, req: any} | null>(null);
  const [scheduleData, setScheduleData] = useState<{sub: any, req: any} | null>(null);
  const [vendorMap, setVendorMap] = useState<Record<string, string>>({});

  const isAdmin = userRole?.includes("admin") || userRole === "hq" || userRole === "super_admin" || userRole === "ops_admin";
  const isVendor = userRole?.includes("vendor") || userRole?.includes("recruiter");
  const isClient = userRole === "client" || userRole?.startsWith("client_");

  useEffect(() => {
     const fetchVendors = async () => {
         try {
            const orgSnap = await getDocs(collection(db, "organizations"));
            const vMap: Record<string, string> = {};
            orgSnap.docs.forEach(d => { if(d.data().name) vMap[d.id] = d.data().name; });
            const usersSnap = await getDocs(collection(db, "users"));
            usersSnap.docs.forEach(d => { 
                const data = d.data();
                if(data.organizationId && data.name && !vMap[data.organizationId]) vMap[data.organizationId] = data.name; 
            });
            setVendorMap(vMap);
         } catch(e) {}
     };
     fetchVendors();
  }, []);

  useEffect(() => {
    if (!userRole) return;
    if (!isAdmin && !orgId) return;

    // Fetch Candidates (Only Admin & Vendor)
    let unsubCand = () => {};
    if (!isClient) {
      let candQ;
      if (isAdmin) candQ = query(collection(db, "candidatePool"));
      else candQ = query(collection(db, "candidatePool"), where("vendorId", "==", orgId));
      
      unsubCand = onSnapshot(candQ, snap => {
        setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    // Fetch Submissions (Admin, Vendor, Client)
    let subQ;
    if (isAdmin) subQ = query(collection(db, "submissions"));
    else if (isVendor) subQ = query(collection(db, "submissions"), where("vendorId", "==", orgId));
    else subQ = query(collection(db, "submissions"), where("clientId", "==", orgId));

    const unsubSub = onSnapshot(subQ, snap => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Requirements for title resolution
    let reqQ;
    if (isAdmin || isVendor) reqQ = query(collection(db, "requirements_public"));
    else reqQ = query(collection(db, "requirements_public"), where("clientId", "==", orgId));
    
    const unsubReq = onSnapshot(reqQ, snap => {
      setRequirements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubCand();
      unsubSub();
      unsubReq();
    };
  }, [orgId, userRole]);

  // Derived Cards
  const cards: any[] = [];

  // 1. Process isolated candidates (Added stage)
  if (!isClient) {
     candidates.forEach(cand => {
        const subsForCand = submissions.filter(s => s.candidateId === (cand.candidateId || cand.id));
        if (subsForCand.length === 0) {
           cards.push({
             id: 'raw-' + cand.id,
             isRaw: true,
             candidateId: cand.candidateId || cand.id,
             name: cand.name || cand.fullName,
             vendorId: cand.vendorId || "",
             vendorName: cand.vendorName || cand.vendorId, // Fallback
             experience: cand.experience,
             skills: cand.skills,
             matchScore: cand.matchScore,
             reqTitle: cand.matchData?.jobTitle || cand.mappedJobId || '',
             status: 'ADDED',
             createdAt: cand.createdAt,
             data: cand
           });
        }
     });
  }

  // 2. Process Submissions
  submissions.forEach(sub => {
     let cData = candidates.find(c => (c.candidateId || c.id) === sub.candidateId);
     const rData = requirements.find(r => r.id === (sub.requirementId || sub.canonicalRequirementId));
     
     const computedStatus = sub.status && sub.status !== "NEW" ? sub.status : "MATCHED";

     if (isClient && (computedStatus === "ADDED" || computedStatus === "MATCHED" || computedStatus === "FLOATED")) {
       return; // Client ONLY sees SUBMITTED, SHORTLISTED, INTERVIEW, SELECTED, ONBOARDED
     }

     cards.push({
        id: sub.id,
        isRaw: false,
        candidateId: sub.candidateId || sub.id,
        name: sub.candidateName || cData?.fullName || cData?.name || "Anonymous",
        vendorId: sub.vendorId || cData?.vendorId || "",
        vendorName: sub.vendorName || cData?.vendorName || sub.vendorId,
        experience: sub.experience || cData?.experience,
        skills: cData?.skills || [],
        matchScore: sub.matchScore || sub.aiMatchScore || null,
        aiAnalysis: sub.aiAnalysis || cData?.aiAnalysis || null,
        reqId: rData?.id,
        reqTitle: rData?.title || 'Unknown Requirement',
        status: computedStatus.toUpperCase(),
        data: sub,
        reqForReview: rData
     });
  });

  const getCardsByStatus = (status: string) => cards.filter(c => c.status === status || c.status.includes(status));

  // Kanban Columns
  const columns = [];
  if (!isClient) {
     columns.push({ id: 'ADDED', title: 'Added' });
     columns.push({ id: 'MATCHED', title: 'Matched' });
  }
  columns.push({ id: 'SUBMITTED', title: 'Submitted' });
  columns.push({ id: 'SHORTLISTED', title: 'Shortlisted' });
  columns.push({ id: 'INTERVIEW', title: 'Interviewing' });
  columns.push({ id: 'OFFER', title: 'Offer' });
  columns.push({ id: 'ONBOARDED', title: 'Onboarded' });
  if (isAdmin || isClient) {
     columns.push({ id: 'REJECTED', title: 'Rejected' });
  }

  const handleDragStart = (e: React.DragEvent, card: any) => {
    if (card.isRaw) return; // Cannot drag raw candidate without submission
    e.dataTransfer.setData("application/json", JSON.stringify(card));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    if (newStage === "ADDED") return;

    try {
      const cardData = JSON.parse(e.dataTransfer.getData("application/json"));
      if (cardData && !cardData.isRaw && cardData.id) {
         await updateDoc(doc(db, "submissions", cardData.id), {
            status: newStage,
            updatedAt: serverTimestamp()
         });
      }
    } catch (err) {
       console.error("Drop error", err);
    }
  };

  return (
    <div className="flex-1 overflow-auto h-full p-4 md:p-8 bg-slate-50/50">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="text-indigo-600 w-6 h-6" /> Candidate Pipeline Kanban
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {isClient ? "Track candidate progression for your open requirements." : "Manage candidate lifecycle from ingestion to placement."}
        </p>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar h-[calc(100vh-200px)]">
        {columns.map(col => {
           const colCards = getCardsByStatus(col.id);
           return (
              <div 
                 key={col.id} 
                 className="flex-shrink-0 w-80 bg-slate-100/80 border border-slate-200/60 rounded-2xl p-4 flex flex-col h-full overflow-hidden"
                 onDragOver={handleDragOver}
                 onDrop={e => handleDrop(e, col.id)}
              >
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">{col.title}</h3>
                    <Badge variant="outline" className="bg-white/60 text-slate-500">{colCards.length}</Badge>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4">
                   {colCards.map(c => (
                      <div 
                        key={c.id}
                        draggable={!c.isRaw}
                        onDragStart={e => handleDragStart(e, c)}
                        onClick={() => {
                          if (onCandidateClick) {
                             const originalCandidate = candidates.find(cand => cand.id === c.candidateId || cand.candidateId === c.candidateId);
                             onCandidateClick(originalCandidate ? { ...originalCandidate, pipelineStage: c.status, reqTitle: c.reqTitle, matchScore: c.matchScore, aiAnalysis: c.aiAnalysis } : { ...c.data, pipelineStage: c.status, reqTitle: c.reqTitle, matchScore: c.matchScore, aiAnalysis: c.aiAnalysis });
                          }
                        }}
                        className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all ${c.isRaw ? 'cursor-pointer hover:border-indigo-400 hover:shadow-md' : 'cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md'}`}
                      >
                         <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 shadow-inner shrink-0 mr-3">
                               {(c.name || 'U')[0]}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                               <h4 className="font-bold text-slate-900 truncate" title={c.name}>{c.name}</h4>
                               <p className="text-xs font-mono text-slate-400 truncate mt-0.5">{c.candidateId}</p>
                            </div>
                         </div>
                         
                         <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                               <span className="text-slate-500">Vendor:</span>
                               <span className="font-medium text-slate-700 truncate max-w-[120px]" title={vendorMap[c.vendorId] || c.vendorName || "Unknown"}>{vendorMap[c.vendorId] || c.vendorName || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-slate-500">Experience:</span>
                               <span className="font-medium text-slate-700 truncate">{c.experience || "Not specified"}</span>
                            </div>
                            
                            {c.reqTitle && (
                               <div className="mt-3 pt-3 border-t border-slate-100">
                                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1">
                                     Best Match
                                     {c.matchScore && <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{c.matchScore}% Match</span>}
                                  </div>
                                  <div className="font-medium text-slate-800 line-clamp-2">{c.reqTitle}</div>
                               </div>
                            )}
                         </div>

                         {!c.isRaw && !isClient && c.status === "SUBMITTED" && (
                             <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setReviewData({sub: c.data, req: c.reqForReview}); }} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-1.5 rounded transition-colors">Review</button>
                                <button onClick={(e) => { e.stopPropagation(); setScheduleData({sub: c.data, req: c.reqForReview}); }} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-1.5 rounded transition-colors">Schedule</button>
                             </div>
                         )}

                         {isClient && c.status === "SUBMITTED" && (
                             <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setReviewData({sub: c.data, req: c.reqForReview}); }} className="flex-1 bg-indigo-600 text-white text-xs font-bold py-1.5 rounded transition-colors">Review Application</button>
                             </div>
                         )}
                      </div>
                   ))}
                   {colCards.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-slate-300/60 rounded-xl flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                         {col.id === 'ADDED' ? 'No New Candidates' : 'Drop Here'}
                      </div>
                   )}
                 </div>
              </div>
           );
        })}
      </div>
      
      {reviewData && (
        <CandidateReviewModal 
          submission={reviewData.sub} 
          requirement={reviewData.req} 
          onClose={() => setReviewData(null)} 
          onSchedule={() => {
             setReviewData(null);
             setScheduleData(reviewData);
          }}
        />
      )}
      {scheduleData && (
        <InterviewSchedulerModal 
          submission={scheduleData.sub} 
          requirement={scheduleData.req} 
          onClose={() => setScheduleData(null)} 
        />
      )}
    </div>
  );
}
