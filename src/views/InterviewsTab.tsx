import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Video, Users, UserCheck, XCircle, CheckCircle, Navigation, Monitor, ArrowRight, Save, RefreshCw } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Badge } from '../lib/Badge';
import { publishEvent } from '../lib/eventEngine';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../lib/Button';
import { InterviewIntelligenceDashboard } from '../components/InterviewIntelligenceDashboard';

export default function InterviewsTab() {
   const [interviews, setInterviews] = useState<any[]>([]);
   const [selectedInterview, setSelectedInterview] = useState<any>(null);
   const [userRole, setUserRole] = useState<string>('user');
   const [userOrgId, setUserOrgId] = useState<string>('');

   const [showRejectForm, setShowRejectForm] = useState(false);
   const [rejectReason, setRejectReason] = useState("");
   const [feedbackNotes, setFeedbackNotes] = useState("");
   
   const [accessToken, setAccessToken] = useState<string | null>(null);
   const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
   const [calLoading, setCalLoading] = useState(false);

   useEffect(() => {
      const token = localStorage.getItem("google_access_token");
      if (token) setAccessToken(token);

      if (auth.currentUser) {
         getDoc(doc(db, "users", auth.currentUser.uid)).then(snap => {
            if (snap.exists()) {
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
      return () => unsub();
   }, []);

   const fetchCalendarEvents = async () => {
      if (!accessToken) return;
      setCalLoading(true);
      try {
         const timeMin = new Date().toISOString();
         const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/gopal@hirenestworkforce.com/events?timeMin=${timeMin}&maxResults=10&singleEvents=true&orderBy=startTime`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
         });
         if (!res.ok) throw new Error("Failed to fetch calendar");
         const data = await res.json();
         setCalendarEvents(data.items || []);
      } catch (err: any) {
         console.warn("Calendar fetch error:", err);
         if (err.message.includes('401') || err.message.includes('expired')) {
            localStorage.removeItem("google_access_token");
            setAccessToken(null);
         }
      } finally {
         setCalLoading(false);
      }
   };

   useEffect(() => {
      if (accessToken) {
         fetchCalendarEvents();
      }
   }, [accessToken]);

   const pushToGoogleCalendar = async (inv: any) => {
      if (!accessToken) return;
      const confirmed = window.confirm("Are you sure you want to schedule this interview on your Google Calendar?");
      if (!confirmed) return;
      
      try {
         // Create event body
         const event = {
            summary: `Interview: ${inv.round}`,
            description: `Interview Details:\n${inv.notes}\nLink: ${inv.meetingLink || ''}`,
            start: {
               dateTime: new Date(`${inv.date}T${inv.time || '09:00'}:00`).toISOString(),
               timeZone: inv.timezone || 'UTC'
            },
            end: {
               dateTime: new Date(new Date(`${inv.date}T${inv.time || '09:00'}:00`).getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
               timeZone: inv.timezone || 'UTC'
            }
         };
         
         const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/gopal@hirenestworkforce.com/events', {
            method: 'POST',
            headers: {
               'Authorization': `Bearer ${accessToken}`,
               'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
         });
         
         if (res.ok) {
            alert('Successfully added to Google Calendar!');
            fetchCalendarEvents();
         } else {
            alert('Failed to add to calendar.');
         }
      } catch (err) {
         console.error(err);
         alert('Error adding to calendar.');
      }
   };

   const handleOutcome = async (outcome: string) => {
      if (!selectedInterview) return;

      if (outcome === 'Reject' && !rejectReason) {
         setShowRejectForm(true);
         return;
      }

      const newStatus = outcome === 'Pass' ? 'PASSED' : outcome === 'Hold' ? 'ON_HOLD' : 'REJECTED';

      try {
         await updateDoc(doc(db, "interviews", selectedInterview.id), {
            status: newStatus,
            outcomeNotes: outcome === 'Reject' ? `${rejectReason} - ${feedbackNotes}` : `Outcome marked as ${outcome} by ${userRole}.`,
            rejectReason: outcome === 'Reject' ? rejectReason : null
         });
         
         if (selectedInterview.submissionId) {
             let nextSubStatus = selectedInterview.round?.toUpperCase() || 'INTERVIEW';
             if (outcome === 'Pass') {
                 nextSubStatus = `${nextSubStatus}_PASSED`;
             } else if (outcome === 'Reject') {
                 nextSubStatus = 'REJECTED';
             }
             await updateDoc(doc(db, "submissions", selectedInterview.submissionId), {
                 status: nextSubStatus
             });
         }
         
         await publishEvent({
            type: outcome === 'Reject' ? 'urgent' : 'success',
            title: `Interview ${outcome}`,
            message: outcome === 'Reject' ? `Candidate rejected: ${rejectReason}` : `Interview for ${selectedInterview.round} was passed.`,
            recipients: ["GLOBAL_ADMIN"]
         });
         
         setSelectedInterview({ ...selectedInterview, status: newStatus });
         setShowRejectForm(false);
         setRejectReason("");
         setFeedbackNotes("");
      } catch (err) {
         console.error(err);
      }
   };

   return (
      <div className="flex-1 flex overflow-hidden p-4 gap-4 pb-0 h-full relative">
         
         {showRejectForm && (
            <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                  <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                     <XCircle className="text-red-500" /> Interview Rejection Feedback
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">Select a structured reason for AI model training.</p>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Rejection Reason</label>
                        <select 
                           value={rejectReason} 
                           onChange={e => setRejectReason(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        >
                           <option value="">Select a reason...</option>
                           <option value="Technical Gap">Technical Gap</option>
                           <option value="Communication Gap">Communication Gap</option>
                           <option value="Budget Misalignment">Budget Misalignment</option>
                           <option value="Culture Fit">Culture Fit</option>
                           <option value="Experience Gap">Experience Gap</option>
                           <option value="Other">Other</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Additional Notes</label>
                        <textarea 
                           value={feedbackNotes} 
                           onChange={e => setFeedbackNotes(e.target.value)}
                           placeholder="Provide specific feedback..."
                           className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                        ></textarea>
                     </div>
                     <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <Button variant="outline" className="flex-1" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                        <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold" onClick={() => handleOutcome('Reject')}>Confirm Rejection</Button>
                     </div>
                  </div>
               </div>
            </div>
         )}
         <section className={`${selectedInterview ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 bg-white border border-slate-200 rounded-lg shadow-sm flex-col lg:min-w-[320px]`}>
            <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0">
               <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-600"/> Interview Pipeline
               </h3>
               <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[9px]">{interviews.length} Scheduled</Badge>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
               {interviews.length === 0 ? (
                  <EmptyState icon={Calendar} title="No Interviews" description="Interviews scheduled from Candidate Pipeline will appear here." actionLabel="View Candidates" onAction={() => window.location.hash = '#/candidates'} />
               ) : (
                  interviews.map(inv => (
                     <div key={inv.id} onClick={() => setSelectedInterview(inv)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedInterview?.id === inv.id ? 'bg-indigo-50/50 border-indigo-200 shadow-sm relative' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                        {selectedInterview?.id === inv.id && (
                           <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />
                        )}
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600">{inv.round || 'Interview'}</span>
                           <Badge variant="outline" className={`text-[9px] ${inv.status === 'SCHEDULED' ? 'bg-amber-50 text-amber-600' : inv.status === 'PASSED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}>{inv.status || 'SCHEDULED'}</Badge>
                        </div>
                        <div className="font-bold text-sm text-slate-800 mb-1">{inv.date || 'TBD'} @ {inv.time || 'TBD'}</div>
                        <div className="text-[11px] text-slate-500 font-medium">Interviewer: {inv.interviewer || 'Not Assigned'}</div>
                     </div>
                  ))
               )}

               {accessToken && (
                  <div className="mt-8 border-t border-slate-200 pt-4 px-2">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800 flex items-center gap-2">
                           <Calendar size={14} className="text-emerald-600"/> <span className="hidden lg:inline">gopal@hirenestworkforce.com</span><span className="lg:hidden">Calendar</span>
                        </h3>
                        {calLoading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
                     </div>
                     {calendarEvents.length === 0 ? (
                        <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg">
                           <span className="text-xs text-slate-500">No upcoming events found.</span>
                        </div>
                     ) : (
                        calendarEvents.map(ev => (
                           <div key={ev.id} className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm mb-2">
                              <div className="text-[11px] font-bold text-slate-800 truncate">{ev.summary || 'Event'}</div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                 {new Date(ev.start?.dateTime || ev.start?.date).toLocaleDateString()}
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               )}
            </div>
         </section>
         
         {selectedInterview ? (
            <section className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col h-full overflow-hidden animate-in slide-in-from-right fade-in absolute lg:relative inset-0 lg:inset-auto z-10 w-full lg:w-auto p-4 lg:p-0">
               <div className="border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-slate-50 lg:bg-white rounded-t-lg">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setSelectedInterview(null)} className="lg:hidden p-2 bg-slate-200 rounded-full"><ArrowRight size={16} className="rotate-180"/></button>
                     <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <Monitor size={20} />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">{selectedInterview.round || 'Interview Workspace'}</h2>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedInterview.id}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge variant="outline" className={`uppercase font-black text-[10px] tracking-widest px-3 py-1 ${selectedInterview.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-800 border-amber-300' : selectedInterview.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                        {selectedInterview.status}
                     </Badge>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Calendar size={12}/> Date</div>
                        <div className="font-semibold text-slate-800 text-sm">{selectedInterview.date || 'TBD'}</div>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Clock size={12}/> Time</div>
                        <div className="font-semibold text-slate-800 text-sm">{selectedInterview.time || 'TBD'} {selectedInterview.timezone ? `(${selectedInterview.timezone})` : ''}</div>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Users size={12}/> Interviewer</div>
                        <div className="font-semibold text-slate-800 text-sm">{selectedInterview.interviewer || 'TBD'}</div>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Video size={12}/> Platform</div>
                        <div className="font-semibold text-slate-800 text-sm">{selectedInterview.mode || selectedInterview.calendarProvider || 'TBD'}</div>
                     </div>
                  </div>
                  
                  {accessToken && selectedInterview.status === 'SCHEDULED' && (
                     <div className="flex justify-end">
                        <Button 
                           onClick={() => pushToGoogleCalendar(selectedInterview)}
                           variant="outline" 
                           className="bg-white border flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                           <Calendar size={14} /> Add to Google Calendar
                        </Button>
                     </div>
                  )}
                  
                  {selectedInterview.meetingLink && (
                     <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 flex items-center justify-between">
                        <div>
                           <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Meeting Link</div>
                           <a href={selectedInterview.meetingLink} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline flex items-center gap-2">
                              {selectedInterview.meetingLink} <Navigation size={14}/>
                           </a>
                        </div>
                     </div>
                  )}
                  
                  <div className="bg-white p-5 rounded-xl border border-slate-200">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b border-slate-100 pb-2 mb-3">Preparation & Internal Notes</h3>
                     <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedInterview.notes || "No context provided."}</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-4 text-center">Capture Interview Outcome</h3>
                     
                     {selectedInterview.status === 'SCHEDULED' ? (
                        <div className="grid grid-cols-3 gap-4">
                           <button onClick={() => handleOutcome('Pass')} className="flex flex-col items-center justify-center p-6 bg-white border-2 border-emerald-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors group">
                               <CheckCircle className="text-emerald-500 mb-2 w-8 h-8 group-hover:scale-110 transition-transform" />
                               <span className="font-bold text-emerald-700">Pass</span>
                           </button>
                           <button onClick={() => handleOutcome('Hold')} className="flex flex-col items-center justify-center p-6 bg-white border-2 border-amber-100 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-colors group">
                               <Clock className="text-amber-500 mb-2 w-8 h-8 group-hover:scale-110 transition-transform" />
                               <span className="font-bold text-amber-700">Hold</span>
                           </button>
                           <button onClick={() => handleOutcome('Reject')} className="flex flex-col items-center justify-center p-6 bg-white border-2 border-rose-100 rounded-xl hover:border-rose-500 hover:bg-rose-50 transition-colors group">
                               <XCircle className="text-rose-500 mb-2 w-8 h-8 group-hover:scale-110 transition-transform" />
                               <span className="font-bold text-rose-700">Reject</span>
                           </button>
                        </div>
                     ) : (
                        <div className="text-center text-sm font-medium text-slate-500">
                           Outcome has been recorded: <span className="font-bold text-slate-800">{selectedInterview.outcomeNotes}</span>
                        </div>
                     )}
                  </div>
               </div>
            </section>
         ) : (
            <div className="hidden lg:flex flex-1 m-4">
               <InterviewIntelligenceDashboard userRole={userRole} orgId={userOrgId} />
            </div>
         )}
      </div>
   );
}
