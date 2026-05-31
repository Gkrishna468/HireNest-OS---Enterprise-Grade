import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Users, Filter, CheckCircle2, Copy, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { Button } from '../../lib/Button';
import { EmptyState } from '../../components/EmptyState';
import { CandidateReviewModal } from '../../components/modals/CandidateReviewModal';
import { InterviewSchedulerModal } from '../../components/modals/InterviewSchedulerModal';

export function ClientCandidatePipeline({ orgId }: { orgId: string }) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [floatedCandidates, setFloatedCandidates] = useState<any[]>([]);
  const [pipelineSubmissions, setPipelineSubmissions] = useState<any[]>([]);
  
  const [reviewData, setReviewData] = useState<{sub: any, req: any} | null>(null);
  const [scheduleData, setScheduleData] = useState<{sub: any, req: any} | null>(null);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    // 1. Fetch requirements
    const reqq = query(collection(db, "requirements_public"), where("clientId", "==", orgId));
    const unsubReq = onSnapshot(reqq, snap => {
      setRequirements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Fetch submissions for this client
    const subq = query(collection(db, "submissions"), where("clientId", "==", orgId));
    const unsubSub = onSnapshot(subq, snap => {
      setPipelineSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Fetch Floated candidates from candidatePool
    const floatq = query(collection(db, "candidatePool"), where("clientId", "==", orgId));
    const unsubFloat = onSnapshot(floatq, snap => {
      setFloatedCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Fetch AI Matches using the unified matching/global intelligence engine
    const fetchMatches = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const role = "client"; // Enforce client role for scoped queries

        for (const req of requirements) {
          const res = await fetch(`/api/matching/global?requirementId=${req.id}&orgId=${orgId}&role=${role}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
             const data = await res.json();
             // Aggregate global dynamic matches into our client LEDGER
             const combinedMatches = [...(data.matches || []), ...(data.fallbackMatches || [])];
             
             setAiMatches(prev => {
                const filtered = prev.filter(m => m.requirementId !== req.id && m.reqId !== req.id);
                const newlyTagged = combinedMatches.map(m => ({
                    ...m,
                    canonicalRequirementId: req.id,
                    requirementId: req.id,
                    reqId: req.id,
                    sysSource: 'AI_MATCH'
                }));
                return [...filtered, ...newlyTagged];
             });
          }
        }
      } catch (err) {
        console.error("Global Match fetch err", err);
      }
    };
    
    // Only fetch matches if requirements exist. We can run this once they drop in.
    if (requirements.length > 0) {
       fetchMatches();
    }
    
    // Refresh periodically but less aggressively since it's a dynamic computation
    const matchInterval = setInterval(fetchMatches, 45000); 

    return () => {
      unsubReq();
      unsubSub();
      unsubFloat();
      clearInterval(matchInterval);
    };
  }, [orgId, requirements.length]);

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

  const renderSection = (title: string, items: any[], req: any, statusBadge: string) => {
     if (items.length === 0) return null;
     
     return (
        <div className="space-y-3">
           <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">{title} ({items.length})</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {items.map(sub => (
               <div key={sub.id} className="bg-white border text-left border-slate-200 p-4 rounded-xl shadow-sm space-y-4 hover:border-indigo-300 transition-colors">
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
            const unifiedCandidates: any[] = [];
            
            // 1. AI Matches
            aiMatches.forEach(c => {
               if (c.canonicalRequirementId === req.id || c.requirementId === req.id || c.reqId === req.id) {
                   unifiedCandidates.push({ ...c, sysSource: 'AI_MATCH', candId: c.candidateId });
               }
            });
            // 2. Vendor Floated
            floatedCandidates.forEach(c => {
               if (c.canonicalRequirementId === req.id || c.mappedJobId === req.id || c.mappedJobId === req.reqId) {
                   unifiedCandidates.push({ ...c, sysSource: 'VENDOR_FLOATED', candId: c.id });
               }
            });
            // 3. Submissions
            pipelineSubmissions.forEach(c => {
               if (c.canonicalRequirementId === req.id || c.requirementId === req.id || c.reqId === req.id || c.jobId === req.id) {
                   unifiedCandidates.push({ ...c, sysSource: 'SUBMISSION', candId: c.candidateId });
               }
            });

            // Deduplicate by candidateId prioritizing Submissions > Vendor Floated > AI Matches
            const dedupedCandMap = new Map();
            for (const cand of unifiedCandidates) {
               if (!cand.candId) continue;
               const existing = dedupedCandMap.get(cand.candId);
               if (existing) {
                  if (cand.sysSource === 'SUBMISSION' && existing.sysSource !== 'SUBMISSION') {
                      dedupedCandMap.set(cand.candId, cand);
                  } else if (cand.sysSource === 'VENDOR_FLOATED' && existing.sysSource === 'AI_MATCH') {
                      dedupedCandMap.set(cand.candId, cand);
                  }
               } else {
                  dedupedCandMap.set(cand.candId, cand);
               }
            }

            const finalCandidates = Array.from(dedupedCandMap.values());

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
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-3 py-1 text-xs rounded-full flex items-center shadow-sm"
                            onClick={async (e) => {
                               e.stopPropagation();
                               const btn = document.getElementById(`refresh-${req.id}`) as HTMLButtonElement;
                               const originalText = btn.innerHTML;
                               btn.innerHTML = 'Working...';
                               btn.disabled = true;
                               try {
                                   const token = await auth.currentUser?.getIdToken();
                                   const res = await fetch('/api/rescan-matches', { 
                                       method: 'POST', 
                                       headers: {
                                         'Content-Type':'application/json',
                                         'Authorization': `Bearer ${token}`
                                       }, 
                                       body: JSON.stringify({ role: 'client', reqId: req.id }) 
                                   });
                                   const d = await res.json();
                                   if (d.success) {
                                       btn.innerHTML = `Completed (${d.matchUpdatesCount} new)`;
                                   } else {
                                       btn.innerHTML = 'Error';
                                   }
                               } catch(err:any) {
                                   btn.innerHTML = 'Error';
                               } finally {
                                   setTimeout(() => {
                                       if (btn) {
                                          btn.innerHTML = originalText;
                                          btn.disabled = false;
                                       }
                                   }, 4000);
                               }
                            }}
                            id={`refresh-${req.id}`}
                        >
                          <Sparkles size={12} className="mr-1" />
                          Refresh AI
                        </Button>
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
                       <div className="space-y-8">
                         {renderSection("AI Matches", reqAiMatches, req, "AI MATCH")}
                         {renderSection("Vendor Floated", reqFloated, req, "FLOATED")}
                         {renderSection("Submitted", submitted, req, "SUBMITTED")}
                         {renderSection("Interviewing", interviewing, req, "INTERVIEW")}
                         {renderSection("Offers", offers, req, "OFFER")}
                         {renderSection("Hired", hired, req, "HIRED")}
                         {renderSection("Rejected", rejected, req, "REJECTED")}
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

