import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Video, Users, Navigation, Monitor, Plus, CheckCircle, MessageSquare } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Badge } from '../lib/Badge';
import { publishEvent } from '../lib/eventEngine';
import { Button } from '../lib/Button';

export default function InterviewsTab() {
   const [interviews, setInterviews] = useState<any[]>([]);
   const [selectedInterview, setSelectedInterview] = useState<any>(null);
   const [userRole, setUserRole] = useState<string>('user');
   const [userOrgId, setUserOrgId] = useState<string>('');

   const [showFeedbackForm, setShowFeedbackForm] = useState(false);
   const [feedback, setFeedback] = useState({
     technical: 3,
     communication: 3,
     domain: 3,
     decision: 'Proceed',
     notes: ''
   });

   useEffect(() => {
      let active = true;
      if (auth.currentUser) {
         getDoc(doc(db, "users", auth.currentUser.uid)).then(snap => {
            if (snap.exists() && active) {
               setUserRole(snap.data().role);
               setUserOrgId(snap.data().organizationId || 'HQ');
            }
         }).catch(err => console.warn(err));
      }

      const q = query(collection(db, "interviews"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(q, snap => {
         const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         setInterviews(data);
      });
      return () => {
         active = false;
         unsub();
      };
   }, []);

   const submitFeedback = async () => {
      if (!selectedInterview) return;

      let newStatus = 'FEEDBACK_SUBMITTED';
      if (feedback.decision === 'Proceed') newStatus = 'DECISION_PENDING';
      else if (feedback.decision === 'Reject') newStatus = 'COMPLETED';

      try {
         await updateDoc(doc(db, "interviews", selectedInterview.id), {
            status: newStatus,
            feedback: {
               ...feedback,
               submittedAt: new Date().toISOString()
            },
            outcomeNotes: `Decision: ${feedback.decision}. Technical: ${feedback.technical}. Notes: ${feedback.notes}`
         });
         
         if (selectedInterview.submissionId) {
             let nextSubStatus = 'INTERVIEW_SCHEDULED';
             if (feedback.decision === 'Proceed') nextSubStatus = 'SHORTLISTED';
             else if (feedback.decision === 'Reject') nextSubStatus = 'REJECTED';
             else if (feedback.decision === 'Hold') nextSubStatus = 'CLIENT_REVIEW';
             await updateDoc(doc(db, "submissions", selectedInterview.submissionId), {
                 status: nextSubStatus
             });
         }
         
         await publishEvent({
            type: feedback.decision === 'Reject' ? 'urgent' : 'success',
            title: `Interview Feedback Submitted`,
            message: `Decision: ${feedback.decision} for ${selectedInterview.round}. ${feedback.notes}`,
            recipients: ["GLOBAL_ADMIN"]
         });
         
         setShowFeedbackForm(false);
         setFeedback({ technical: 3, communication: 3, domain: 3, decision: 'Proceed', notes: '' });
         setSelectedInterview(null);
      } catch (err) {
         console.error(err);
      }
   };

   const KANBAN_STAGES = [
     { id: 'REQUESTED', label: 'Requested' },
     { id: 'AVAILABILITY_PENDING', label: 'Availability Pending' },
     { id: 'SCHEDULING', label: 'Scheduling' },
     { id: 'SCHEDULED', label: 'Scheduled', defaultIncludes: ['INTERVIEW_SCHEDULED', 'INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2', 'FINAL_INTERVIEW'] },
     { id: 'COMPLETED', label: 'Completed' },
     { id: 'FEEDBACK_PENDING', label: 'Feedback Pending' },
     { id: 'DECISION_PENDING', label: 'Decision Pending' }
   ];

   const getColumns = () => {
      const cols: Record<string, any[]> = {};
      KANBAN_STAGES.forEach(s => cols[s.id] = []);
      interviews.forEach(inv => {
         let st = inv.status || 'SCHEDULED';
         if (st === 'INTERVIEW_REQUESTED' || st === 'REQUESTED') st = 'REQUESTED';
         else if (st === 'AVAILABILITY_PENDING') st = 'AVAILABILITY_PENDING';
         else if (st === 'AVAILABILITY_COLLECTED' || st === 'SCHEDULING') st = 'SCHEDULING';
         else if (st === 'INTERVIEW_SCHEDULED' || st.startsWith('INTERVIEW_ROUND') || st === 'FINAL_INTERVIEW' || st === 'SCHEDULED') st = 'SCHEDULED';
         else if (st === 'PASSED' || st === 'REJECTED' || st === 'COMPLETED') st = 'COMPLETED';
         else if (st === 'FEEDBACK_PENDING') st = 'FEEDBACK_PENDING';
         else if (st === 'DECISION_PENDING' || st === 'FEEDBACK_SUBMITTED') st = 'DECISION_PENDING';
         
         if (cols[st]) cols[st].push(inv);
         else if (cols['SCHEDULED']) cols['SCHEDULED'].push(inv); // fallback
      });
      return cols;
   };

   const columns = getColumns();

   return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative h-full">
         <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
                  <Monitor size={20} className="relative z-10" />
               </div>
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Interview Control Tower</h1>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Manage full interview lifecycle</p>
               </div>
            </div>
         </header>

         <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar flex gap-6">
            {KANBAN_STAGES.map(stage => {
               const stageCards = columns[stage.id];
               return (
                  <div key={stage.id} className="w-80 shrink-0 flex flex-col max-h-full">
                     <div className="font-bold text-[11px] uppercase tracking-widest text-slate-500 mb-3 flex items-center justify-between">
                        {stage.label}
                        <Badge variant="outline" className="bg-white text-slate-500 border-slate-200">{stageCards.length}</Badge>
                     </div>
                     <div className="flex-1 overflow-y-auto space-y-3 pb-6 custom-scrollbar">
                        {stageCards.map(inv => (
                           <div key={inv.id} onClick={() => setSelectedInterview(inv)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer block">
                              <div className="flex items-center justify-between mb-2">
                                 <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] uppercase tracking-wider">{inv.round || 'Round'}</Badge>
                                 <span className="text-[10px] text-slate-400 font-mono">
                                    {inv.createdAt ? new Date(inv.createdAt.seconds ? inv.createdAt.seconds * 1000 : inv.createdAt).toLocaleDateString() : ''}
                                 </span>
                              </div>
                              <h3 className="font-bold text-slate-800 text-sm mb-2">{inv.candidateName || 'Candidate'}</h3>
                              <div className="space-y-1 text-xs text-slate-500 mb-3">
                                 <div className="flex items-center gap-2"><Calendar size={12}/> {inv.date || 'TBD'} {inv.time ? `at ${inv.time}` : ''}</div>
                                 <div className="flex items-center gap-2"><Users size={12}/> {inv.interviewer || 'TBD'}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               );
            })}
         </div>

         {selectedInterview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
               <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                     <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">{selectedInterview.round || 'Interview Details'}</h2>
                        <div className="text-xs text-slate-500 font-medium tracking-wide mt-1 uppercase">{selectedInterview.status || 'SCHEDULED'}</div>
                     </div>
                     <button onClick={() => setSelectedInterview(null)} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100"><Plus size={20} className="rotate-45" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6 bg-white">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Candidate</div>
                           <div className="font-semibold text-slate-800 text-sm">{selectedInterview.candidateName || 'TBD'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Interviewer</div>
                           <div className="font-semibold text-slate-800 text-sm">{selectedInterview.interviewer || 'TBD'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Date & Time</div>
                           <div className="font-semibold text-slate-800 text-sm">{selectedInterview.date || 'TBD'} {selectedInterview.time || ''}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Platform</div>
                           <div className="font-semibold text-slate-800 text-sm">{selectedInterview.mode || 'TBD'}</div>
                        </div>
                     </div>

                     {selectedInterview.meetingLink && (
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Meeting Link</div>
                           <a href={selectedInterview.meetingLink} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold text-sm hover:underline flex items-center gap-2">
                              {selectedInterview.meetingLink} <Navigation size={12}/>
                           </a>
                        </div>
                     )}

                     <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Preparation Notes</div>
                        <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">{selectedInterview.notes || 'No specific notes.'}</p>
                     </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex gap-3 justify-end shrink-0">
                     <Button variant="outline" className="bg-white" onClick={() => setSelectedInterview(null)}>Close</Button>
                     <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => { setSelectedInterview(null); setShowFeedbackForm(true); }}>
                        <MessageSquare size={16} className="mr-2"/> Provide Feedback
                     </Button>
                  </div>
               </div>
            </div>
         )}

         {showFeedbackForm && (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                  <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                     <CheckCircle className="text-indigo-500" /> Structured Interview Feedback
                  </h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Final Decision</label>
                        <select 
                           value={feedback.decision} 
                           onChange={e => setFeedback({...feedback, decision: e.target.value as any})}
                           className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                           <option value="Proceed">Proceed (Pass / Advance)</option>
                           <option value="Hold">Hold (Client Review)</option>
                           <option value="Reject">Reject</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Notes</label>
                        <textarea 
                           value={feedback.notes} 
                           onChange={e => setFeedback({...feedback, notes: e.target.value})}
                           placeholder="Provide specific feedback..."
                           className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                        ></textarea>
                     </div>
                     <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <Button variant="outline" className="flex-1" onClick={() => setShowFeedbackForm(false)}>Cancel</Button>
                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={submitFeedback}>Submit Feedback</Button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

