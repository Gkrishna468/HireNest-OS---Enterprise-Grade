import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");

  useEffect(() => {
    if (!orgId) return;

    const reqq = query(collection(db, "requirements_public"), where("clientId", "==", orgId));
    const unsubReq = onSnapshot(reqq, snap => {
      setRequirements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const fetchMatches = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/client-matches?orgId=${orgId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           setSubmissions(data.matches || []);
        }
      } catch (err) {
        console.error("Match fetch err", err);
      }
    };
    fetchMatches();
    const matchInterval = setInterval(fetchMatches, 15000); // refresh every 15s

    return () => {
      unsubReq();
      clearInterval(matchInterval);
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
        </div>

        <div className="space-y-8">
          {requirements.map(req => {
            const reqSubmissions = submissions.filter(s => s.reqId === req.id || s.requirementId === req.id);
            
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-900 p-4 flex items-center justify-between">
                   <h2 className="text-lg font-bold text-white flex flex-col md:flex-row md:items-center gap-3">
                     {req.title}
                     <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 w-max">
                        {reqSubmissions.length} Candidates
                     </Badge>
                   </h2>
                   
                   <Button 
                       className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-3 py-1 text-xs rounded-full flex items-center shadow-sm"
                       onClick={async () => {
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
                     Refresh Matches
                   </Button>
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
