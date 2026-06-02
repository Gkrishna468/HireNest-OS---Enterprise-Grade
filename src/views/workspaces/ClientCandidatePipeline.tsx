import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Users, Filter, CheckCircle2, Copy, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { Button } from '../../lib/Button';
import { EmptyState } from '../../components/EmptyState';
import { CandidateReviewModal } from '../../components/modals/CandidateReviewModal';
import { InterviewSchedulerModal } from '../../components/modals/InterviewSchedulerModal';

export function ClientCandidatePipeline({ orgId, userRole }: { orgId: string, userRole: string | null }) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  
  const [reviewData, setReviewData] = useState<{sub: any, req: any} | null>(null);
  const [scheduleData, setScheduleData] = useState<{sub: any, req: any} | null>(null);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !userRole) return;

    // 1. Fetch requirements based on role
    let reqq;
    if (userRole === "admin" || userRole === "hq") {
       reqq = query(collection(db, "requirements_public"));
    } else if (userRole.includes("vendor") || userRole.includes("recruiter")) {
       // Vendors see requirements globally or assigned to them. Just fetching all active for now for the pipeline view (where their candidates are)
       reqq = query(collection(db, "requirements_public"));
    } else {
       reqq = query(collection(db, "requirements_public"), where("clientId", "==", orgId));
    }
    
    const unsubReq = onSnapshot(reqq, snap => {
      setRequirements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Fetch submissions via real-time listener depending on role
    let subQ;
    if (userRole === "admin" || userRole === "hq") {
       subQ = query(collection(db, "submissions"));
    } else if (userRole.includes("vendor") || userRole.includes("recruiter")) {
       subQ = query(collection(db, "submissions"), where("vendorOrgId", "==", orgId));
    } else {
       subQ = query(collection(db, "submissions"), where("clientId", "==", orgId));
    }
    
    const unsubSub = onSnapshot(subQ, snap => {
      const allSubs = snap.docs.map(doc => {
        const data = doc.data();
        let sourceStr = 'SUBMISSION';
        if (data.status === 'MATCHED') sourceStr = 'AI_MATCH';
        if (data.vendorId === 'ORG-EXTERNAL-VENDOR') sourceStr = 'VENDOR_FLOATED';
        
        return {
           id: doc.id,
           ...data,
           canonicalRequirementId: data.requirementId || data.canonicalRequirementId,
           reqId: data.requirementId,
           sysSource: sourceStr
        };
      });
      setAiMatches(allSubs);
    });

    return () => {
      unsubReq();
      unsubSub();
    };
  }, [orgId]);

  if (requirements.length === 0) {
    return (
      <div className="flex-1 p-8 flex flex-col justify-center">
        <EmptyState 
           icon={Users} 
           title="No Candidate Matches Yet" 
           description="When vendors or recruiters float candidates against your requirements, they will appear here for your review."
        />
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, sub: any) => {
    e.dataTransfer.setData("application/json", JSON.stringify(sub));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    try {
      const subData = JSON.parse(e.dataTransfer.getData("application/json"));
      if (subData && subData.id) {
        const batch = writeBatch(db);
        
        // Update submission
        batch.update(doc(db, "submissions", subData.id), {
          status: newStage,
          updatedAt: serverTimestamp()
        });
        
        // Also fire update to candidate globally!
        if (subData.candidateId) {
           batch.update(doc(db, "candidatePool", subData.candidateId), {
             pipelineStage: newStage,
             updatedAt: serverTimestamp()
           });
        }
        
        await batch.commit();
      }
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  const renderKanbanColumn = (title: string, items: any[], req: any, statusBadge: string) => {
     return (
        <div 
           className="flex-shrink-0 w-80 bg-slate-100 rounded-2xl p-4 flex flex-col max-h-[800px]"
           onDragOver={handleDragOver}
           onDrop={(e) => handleDrop(e, statusBadge)}
        >
           <h3 className="font-black text-slate-800 tracking-tight text-sm mb-4 flex justify-between items-center">
              {title}
              <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
           </h3>
           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4">
             {items.map(sub => (
               <div 
                 key={sub.id} 
                 draggable
                 onDragStart={(e) => handleDragStart(e, sub)}
                 className="bg-white border text-left border-slate-200 p-4 rounded-xl shadow-sm space-y-4 hover:border-indigo-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
               >
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{sub.candidateName || sub.fullName || sub.name || 'Anonymous Candidate'}</h3>
                      <p className="text-xs text-slate-500">Match Score: {sub.matchScore || sub.aiMatchScore ? `${sub.matchScore || sub.aiMatchScore}%` : 'Pending'}</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold tracking-widest">{sub.status || sub.pipelineStage || sub.currentStage || statusBadge || 'Unknown'}</Badge>
                 </div>
                 
                 {sub.vendorName && (
                   <div className="text-xs text-slate-600 font-medium">Vendor: <span className="text-slate-900">{sub.vendorName}</span></div>
                 )}
                 
                 <div className="pt-2 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setReviewData({sub, req}); }} className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors">Review</button>
                    <button onClick={(e) => { e.stopPropagation(); setScheduleData({sub, req}); }} className="flex-1 bg-emerald-50 text-emerald-700 text-xs font-bold py-2 rounded-lg hover:bg-emerald-100 transition-colors">Schedule</button>
                 </div>
               </div>
             ))}
             {items.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                   Drop Here
                </div>
             )}
           </div>
        </div>
     );
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="text-indigo-600" /> Requirement Dashboard
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Review candidates from AI Match, Vendor Pipeline, and Submissions.</p>
          </div>
        </div>

        <div className="space-y-6">
          {requirements.map(req => {
            // Unified Requirement Candidate Ledger approach
            const finalCandidates = aiMatches.filter(c => c.canonicalRequirementId === req.id || c.requirementId === req.id || c.reqId === req.id);

            const reqAiMatches = finalCandidates.filter(c => c.sysSource === 'AI_MATCH');
            const reqFloated = finalCandidates.filter(c => c.sysSource === 'VENDOR_FLOATED');
            
            const subItems = finalCandidates.filter(c => c.sysSource === 'SUBMISSION');
            
            const submitted = subItems.filter(s => s.status === 'SUBMITTED' || s.status === 'DEAL_ROOM' || s.pipelineStage === 'Deal Room' || !s.status || s.status === 'MATCHED' || (s.status && s.status.includes('SUBMIT')));
            const interviewing = subItems.filter(s => s.status === 'INTERVIEW' || s.status === 'INTERVIEWING' || (s.status && s.status.includes('INTERVIEW')));
            const offers = subItems.filter(s => s.status === 'OFFER' || (s.status && s.status.includes('OFFER')));
            const hired = subItems.filter(s => s.status === 'HIRED' || s.status === 'PLACED');
            const rejected = subItems.filter(s => s.status === 'REJECTED' || (s.status && s.status.includes('REJECT')));

            const isExpanded = expandedReq === req.id;
            const totalCandidates = finalCandidates.length;

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
                <div 
                   className="bg-slate-900 p-4 md:px-6 cursor-pointer flex flex-col hover:bg-slate-800 transition-colors"
                   onClick={() => setExpandedReq(isExpanded ? null : req.id)}
                >
                   <div className="flex items-center justify-between">
                     <h2 className="text-lg font-bold text-white flex items-center gap-3">
                       {req.title}
                       <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 text-[10px]">
                          {req.status || 'Active'}
                       </Badge>
                     </h2>
                     <div className="flex items-center gap-2">

                        {isExpanded ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
                     </div>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                      <div className="flex items-center text-slate-400">
                         <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                         AI Matches: <span className="text-white ml-1 font-mono">{reqAiMatches.length}</span>
                      </div>
                      <div className="w-px h-3 bg-slate-700 mx-1" />
                      <div className="flex items-center text-slate-400">
                         <div className="w-2 h-2 rounded-full bg-purple-500 mr-1" />
                         Vendor Floated: <span className="text-white ml-1 font-mono">{reqFloated.length}</span>
                      </div>
                      <div className="w-px h-3 bg-slate-700 mx-1" />
                      <div className="flex items-center text-slate-400">
                         <div className="w-2 h-2 rounded-full bg-amber-500 mr-1" />
                         Submitted: <span className="text-white ml-1 font-mono">{submitted.length}</span>
                      </div>
                      <div className="w-px h-3 bg-slate-700 mx-1" />
                      <div className="flex items-center text-slate-400">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
                         Interviewing: <span className="text-white ml-1 font-mono">{interviewing.length}</span>
                      </div>
                      <div className="w-px h-3 bg-slate-700 mx-1" />
                      <div className="flex items-center text-slate-400">
                         <div className="w-2 h-2 rounded-full bg-rose-500 mr-1" />
                         Rejected: <span className="text-white ml-1 font-mono">{rejected.length}</span>
                      </div>   
                   </div>
                </div>
                
                {isExpanded && (
                  <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200">
                     {totalCandidates === 0 ? (
                       <div className="text-center py-6 text-slate-500 text-sm">
                         No candidates found for this requirement.
                       </div>
                     ) : (
                       <div className="flex gap-6 overflow-x-auto overflow-y-hidden pb-4 pt-2 px-2 custom-scrollbar">
                          {renderKanbanColumn("AI Matched", reqAiMatches, req, "MATCHED")}
                          {renderKanbanColumn("Vendor Floated", reqFloated, req, "FLOATED")}
                          {renderKanbanColumn("Submitted", submitted, req, "SUBMITTED")}
                          {renderKanbanColumn("Interview", interviewing, req, "INTERVIEW")}
                          {renderKanbanColumn("Offer", offers, req, "OFFER")}
                          {renderKanbanColumn("Placed", hired, req, "PLACED")}
                          {renderKanbanColumn("Rejected", rejected, req, "REJECTED")}
                       </div>
                     )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

