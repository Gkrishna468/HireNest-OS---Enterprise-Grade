import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, Filter, CheckCircle2, Copy, Sparkles } from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { Button } from '../../lib/Button';
import { EmptyState } from '../../components/EmptyState';
import { CandidateReviewModal } from '../../components/modals/CandidateReviewModal';
import { InterviewSchedulerModal } from '../../components/modals/InterviewSchedulerModal';

export function ClientCandidatePipeline({ orgId }: { orgId: string }) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [reviewData, setReviewData] = useState<{sub: any, req: any} | null>(null);
  const [scheduleData, setScheduleData] = useState<{sub: any, req: any} | null>(null);

  useEffect(() => {
    if (!orgId) return;

    const reqq = query(collection(db, "requirements_public"), where("clientId", "==", orgId));
    const unsubReq = onSnapshot(reqq, snap => {
      setRequirements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const subq = query(collection(db, "submissions"), where("clientId", "==", orgId));
    const unsubSub = onSnapshot(subq, snap => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter((s:any) => s.status !== 'PENDING_REVIEW' && s.status !== 'MATCH_REJECTED' && s.status !== 'submitted'));
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

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="text-indigo-600" /> Match Center
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Review candidates floating against your active requirements.</p>
          </div>
          <div>
             <Button 
                 onClick={async () => {
                   if(!confirm('Refresh match matrix using Google AI? This updates unsubmitted candidates only.')) return;
                   try {
                     const res = await fetch('/api/rescan-matches', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({role: 'client'}) });
                     const d = await res.json();
                     if (d.success) alert(`Rescan complete. Updated ${d.matchUpdatesCount} matches in the global pool.`);
                     else alert("Error: " + d.error);
                   } catch(e:any) {
                     alert("Error: " + e.message);
                   }
                 }}
                 className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 text-sm rounded-lg flex items-center shadow-sm"
             >
                 <Sparkles size={16} className="mr-2" />
                 Refresh Match Matrix
             </Button>
          </div>
        </div>

        <div className="space-y-8">
          {requirements.map(req => {
            const reqSubmissions = submissions.filter(s => s.reqId === req.id || s.requirementId === req.id);
            
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-900 p-4 flex items-center justify-between">
                   <h2 className="text-lg font-bold text-white">{req.title}</h2>
                   <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
                      {reqSubmissions.length} Candidates
                   </Badge>
                </div>
                
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50">
                   {reqSubmissions.length === 0 ? (
                     <div className="col-span-full p-8 text-center text-slate-500 text-sm">
                       No candidates floated yet.
                     </div>
                   ) : (
                     reqSubmissions.map(sub => (
                       <div key={sub.id} className="bg-white border text-left border-slate-200 p-4 rounded-xl shadow-sm space-y-4 hover:border-indigo-300 transition-colors">
                          <div className="flex justify-between items-start">
                             <div>
                               <h3 className="font-bold text-slate-900">{sub.candidateName || 'Anonymous Candidate'}</h3>
                               <p className="text-xs text-slate-500">Match Score: {sub.matchScore ? `${sub.matchScore}%` : 'Pending'}</p>
                             </div>
                             <Badge className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold tracking-widest">{sub.status}</Badge>
                          </div>
                          
                          {sub.vendorName && (
                            <div className="text-xs text-slate-600 font-medium">Vendor: <span className="text-slate-900">{sub.vendorName}</span></div>
                          )}
                          
                          <div className="pt-2 flex gap-2">
                             <button onClick={() => setReviewData({sub, req})} className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors">Review</button>
                             <button onClick={() => setScheduleData({sub, req})} className="flex-1 bg-emerald-50 text-emerald-700 text-xs font-bold py-2 rounded-lg hover:bg-emerald-100 transition-colors">Schedule</button>
                          </div>
                       </div>
                     ))
                   )}
                </div>
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
