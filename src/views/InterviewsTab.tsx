import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Video, Users, Navigation, Monitor, Plus, CheckCircle, MessageSquare, AlertTriangle, ArrowRight, RefreshCw, Sparkles, ShieldAlert, X } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, doc, getDoc, where, serverTimestamp } from 'firebase/firestore';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';

export default function InterviewsTab() {
   const [submissions, setSubmissions] = useState<any[]>([]);
   const [candidatesMap, setCandidatesMap] = useState<Record<string, any>>({});
   const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
   const [userRole, setUserRole] = useState<string>('user');
   const [userOrgId, setUserOrgId] = useState<string>('');
   const [currentTab, setCurrentTab] = useState<'pipeline' | 'recovery'>('pipeline');
   const [recoveryFilter, setRecoveryFilter] = useState<'all' | 'resume' | 'skills' | 'ready'>('all');

   const [showFeedbackForm, setShowFeedbackForm] = useState(false);
   const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
   const [showConfirmSchedule, setShowConfirmSchedule] = useState(false);
   const [availabilitySlots, setAvailabilitySlots] = useState([{ date: '', time: '' }]);
   const [confirmSlot, setConfirmSlot] = useState({ date: '', time: '', meetingLink: '' });
   
   const [rejectReason, setRejectReason] = useState('');
   const [feedback, setFeedback] = useState({
     technical: 3,
     communication: 3,
     domain: 3,
     decision: 'Proceed',
     notes: ''
   });

   const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);
   const [isDraggingId, setIsDraggingId] = useState<string | null>(null);

   const handleDragStart = (e: React.DragEvent, subId: string, fromStage: string) => {
      setIsDraggingId(subId);
      e.dataTransfer.setData("text/plain", JSON.stringify({ submissionId: subId, fromStage }));
      e.dataTransfer.effectAllowed = "move";
   };

   const handleDragEnd = () => {
      setIsDraggingId(null);
      setDraggedOverStage(null);
   };

   const handleDragOver = (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      if (draggedOverStage !== stageId) {
         setDraggedOverStage(stageId);
      }
   };

   const handleDragLeave = (e: React.DragEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
         setDraggedOverStage(null);
      }
   };

   const handleDrop = async (e: React.DragEvent, targetStage: string) => {
      e.preventDefault();
      setDraggedOverStage(null);
      setIsDraggingId(null);
      
      try {
         const dataStr = e.dataTransfer.getData("text/plain");
         if (!dataStr) return;
         const { submissionId, fromStage } = JSON.parse(dataStr);
         if (fromStage === targetStage) return;

         const sub = submissions.find(s => s.id === submissionId);
         if (!sub) return;

         const isVendorRole = userRole.includes('vendor') || userRole === 'recruiter';
         if (isVendorRole && targetStage !== 'SUBMITTED') {
            alert("Permission Denied: Vendors can only resubmit rejected candidates to 'Submitted'.");
            return;
         }

         if (targetStage === 'SHORTLISTED' && fromStage === 'SUBMITTED') {
            setSelectedSubmission(sub);
            setShowAvailabilityForm(true);
         } else if (targetStage === 'L1' && fromStage === 'SHORTLISTED') {
            setSelectedSubmission(sub);
            setShowConfirmSchedule(true);
         } else if (targetStage === 'L2' && fromStage === 'L1') {
            setSelectedSubmission(sub);
            setFeedback({ ...feedback, decision: 'Proceed' });
            setShowFeedbackForm(true);
         } else {
            await handleStateTransition(submissionId, targetStage);
         }
      } catch (err) {
         console.error("Drop transition failed:", err);
      }
   };

   // Fetch candidate pool reference
   useEffect(() => {
      const unsub = onSnapshot(collection(db, "candidates"), snap => {
         const cmap: Record<string, any> = {};
         snap.forEach(d => cmap[d.id] = d.data());
         setCandidatesMap(cmap);
      });
      return () => unsub();
   }, []);

   // Fetch user session context and subscribe to submissions
   useEffect(() => {
      let active = true;
      let unsubscribeData = () => {};

      if (auth.currentUser) {
         getDoc(doc(db, "users", auth.currentUser.uid)).then(snap => {
            if (snap.exists() && active) {
                const role = snap.data().role || 'user';
                const orgId = snap.data().organizationId || 'HQ';
                setUserRole(role);
                setUserOrgId(orgId);

                let q;
                const isAdmin = role === "admin" || role === "super_admin" || role === "ops_admin" || role === "hq_admin" || orgId === "ORG-GLOBAL-HQ";

                if (isAdmin) {
                  q = query(collection(db, "submissions"));
                } else if (role.includes("vendor") || role === "recruiter") {
                  q = query(collection(db, "submissions"), where("vendorId", "==", orgId));
                } else if (role.includes("client") || role === "hiring_manager") {
                  q = query(collection(db, "submissions"), where("clientId", "==", orgId));
                } else {
                  q = query(collection(db, "submissions"));
                }

                unsubscribeData = onSnapshot(q, querySnap => {
                   const data = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
                   
                   // Sort locally by creation timestamp
                   data.sort((a: any, b: any) => {
                      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return bTime - aTime;
                   });
                   setSubmissions(data);
                }, err => {
                   console.error("Submissions Listener Error:", err);
                });
            }
         }).catch(err => console.warn(err));
      }

      return () => {
         active = false;
         unsubscribeData();
      };
   }, []);

   // Backend state transition caller
   const handleStateTransition = async (submissionId: string, newStatus: string, extraData: Record<string, any> = {}) => {
      try {
         const token = await auth.currentUser?.getIdToken();
         if (!token) throw new Error("No authentication token found.");

         const response = await fetch('/api/submissions/transition', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
               submissionId,
               newStatus,
               ...extraData
            })
         });

         const result = await response.json();
         if (!response.ok) {
            throw new Error(result.error || "Failed to transition state");
         }

         return result;
      } catch (err: any) {
         console.error("State Transition Error:", err);
         alert(`State Policy Violation: ${err.message}`);
         throw err;
      }
   };

   const submitAvailability = async () => {
      if (!selectedSubmission) return;
      const validSlots = availabilitySlots.filter(s => s.date && s.time);
      if (validSlots.length === 0) {
         alert("Please add at least one valid date and time.");
         return;
      }
      try {
         // Perform transition through API
         await handleStateTransition(selectedSubmission.id, 'SHORTLISTED', {
            interviewDetails: {
               availableSlots: validSlots
            }
         });
         
         setShowAvailabilityForm(false);
         setAvailabilitySlots([{ date: '', time: '' }]);
         setSelectedSubmission(null);
      } catch (err) {
         // Handled in handler
      }
   };

   const confirmSchedule = async () => {
      if (!selectedSubmission) return;
      if (!confirmSlot.date || !confirmSlot.time) {
         alert("Please select a date and time.");
         return;
      }
      try {
         // Confirm interview through transition
         await handleStateTransition(selectedSubmission.id, 'L1', {
            interviewDetails: {
               date: confirmSlot.date,
               time: confirmSlot.time,
               meetingLink: confirmSlot.meetingLink || ''
            }
         });
         
         setShowConfirmSchedule(false);
         setConfirmSlot({ date: '', time: '', meetingLink: '' });
         setSelectedSubmission(null);
      } catch (err) {
         // Handled
      }
   };

   const submitFeedback = async () => {
      if (!selectedSubmission) return;

      let newStatus = 'SHORTLISTED';
      if (feedback.decision === 'Proceed') newStatus = 'L2';
      else if (feedback.decision === 'Reject') newStatus = 'REJECTED';

      try {
         await handleStateTransition(selectedSubmission.id, newStatus, {
            rejectReason: feedback.notes,
            interviewDetails: {
               feedback: {
                  ...feedback,
                  submittedAt: new Date().toISOString()
               }
            }
         });
         
         setShowFeedbackForm(false);
         setFeedback({ technical: 3, communication: 3, domain: 3, decision: 'Proceed', notes: '' });
         setSelectedSubmission(null);
      } catch (err) {
         // Handled
      }
   };

   // 10-Stage Enterprise Pipeline Definition
   const KANBAN_STAGES = [
     { id: 'SUBMITTED', label: 'Submitted' },
     { id: 'SHORTLISTED', label: 'Shortlisted' },
     { id: 'L1', label: 'L1' },
     { id: 'L2', label: 'L2' },
     { id: 'CLIENT_ROUND', label: 'Client Round' },
     { id: 'MANAGER_ROUND', label: 'Manager Round' },
     { id: 'HR_ROUND', label: 'HR Round' },
     { id: 'OFFER', label: 'Offer' },
     { id: 'JOINED', label: 'Joined' },
     { id: 'CLOSED', label: 'Closed' }
   ];

   // Filters submissions for Active Pipeline columns
   const getColumns = () => {
      const cols: Record<string, any[]> = {};
      KANBAN_STAGES.forEach(s => cols[s.id] = []);
      submissions.forEach(sub => {
         const st = (sub.status || 'SUBMITTED').toUpperCase();
         if (cols[st]) {
            cols[st].push(sub);
         }
      });
      return cols;
   };

   const columns = getColumns();

   // Filters submissions for Candidate Recovery Center
   const getRejectedSubmissions = () => {
      return submissions.filter(sub => {
         if ((sub.status || '').toUpperCase() !== 'REJECTED') return false;
         
         if (recoveryFilter === 'resume') {
            return sub.gapAnalysis?.missingKeywords?.length > 0;
         }
         if (recoveryFilter === 'skills') {
            return sub.gapAnalysis?.missingSkills?.length > 0;
         }
         if (recoveryFilter === 'ready') {
            return (sub.gapAnalysis?.placementProbability || 0) >= 50;
         }
         return true;
      });
   };

   const rejectedCards = getRejectedSubmissions();

   const getSlaIndicator = (sla: any) => {
      if (!sla) return { label: 'SLA: Active', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
      if (sla.completedAt) return { label: 'SLA: Done', color: 'bg-slate-100 text-slate-600 border-slate-200' };
      
      const deadline = new Date(sla.deadline);
      const now = new Date();
      const timeRemaining = deadline.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.round(timeRemaining / (1000 * 60 * 60)));

      if (now > deadline) {
         return { label: 'SLA: Breached', color: 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' };
      } else if (hoursRemaining < 12) {
         return { label: `SLA: ${hoursRemaining}h left`, color: 'bg-amber-50 text-amber-600 border-amber-200' };
      }
      return { label: `SLA: ${hoursRemaining}h left`, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
   };

   const checkIsVendor = (role: string) => role.includes('vendor') || role === 'recruiter';
   const checkIsAdmin = (role: string) => role === 'admin' || role === 'super_admin' || role === 'hq_admin';

   return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative h-full">
         <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
                  <Monitor size={20} className="relative z-10" />
               </div>
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Enterprise Operations Tower</h1>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Control pipeline, SLAs, and continuous recovery</p>
               </div>
            </div>

            {/* Custom Tab Toggles */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
               <button 
                  onClick={() => setCurrentTab('pipeline')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${currentTab === 'pipeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
               >
                  Active Pipeline
               </button>
               <button 
                  onClick={() => setCurrentTab('recovery')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${currentTab === 'recovery' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
               >
                  <Sparkles size={13} /> Recovery Center
               </button>
            </div>
         </header>

         {currentTab === 'pipeline' ? (
            /* ACTIVE PIPELINE KANBAN */
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar flex gap-6">
               {KANBAN_STAGES.map(stage => {
                  const stageCards = columns[stage.id] || [];
                  const isDraggedOver = draggedOverStage === stage.id;
                  return (
                     <div 
                        key={stage.id} 
                        onDragOver={(e) => handleDragOver(e, stage.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage.id)}
                        className={`w-80 shrink-0 flex flex-col max-h-full rounded-2xl p-2 transition-all ${
                           isDraggedOver 
                              ? 'bg-indigo-50/50 border-2 border-dashed border-indigo-400 ring-2 ring-indigo-100/50' 
                              : 'border-2 border-transparent'
                        }`}
                     >
                        <div className="font-bold text-[11px] uppercase tracking-widest text-slate-500 mb-3 flex items-center justify-between px-1">
                           {stage.label}
                           <Badge variant="outline" className="bg-white text-slate-500 border-slate-200">{stageCards.length}</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pb-6 custom-scrollbar px-1">
                           {stageCards.map(sub => {
                              const cand = candidatesMap[sub.candidateId] || {};
                              const slaInfo = getSlaIndicator(sub.sla);
                              const matchScore = sub.matchScore || sub.aiFitScore || 85;
                              const isVendorRole = checkIsVendor(userRole);
                              
                              // Mask client identity for vendors
                              const displayClient = isVendorRole 
                                 ? `CL-${sub.clientId?.slice(-4).toUpperCase() || '2847'}` 
                                 : sub.clientName || 'Enterprise Client';

                              const isDraggingThisCard = isDraggingId === sub.id;

                              return (
                                 <div 
                                    key={sub.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, sub.id, stage.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => setSelectedSubmission(sub)} 
                                    className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer block select-none ${
                                       isDraggingThisCard ? 'opacity-40 border-dashed border-indigo-300 scale-95' : ''
                                    }`}
                                 >
                                    <div className="flex items-start justify-between mb-2">
                                       <h3 className="font-bold text-slate-800 text-sm">{sub.candidateName || cand.fullName || 'Candidate'}</h3>
                                       <span className="text-[10px] font-mono text-slate-400">sub-{sub.id.slice(-4)}</span>
                                    </div>
                                    
                                    <div className="space-y-1 text-xs text-slate-500 mb-3">
                                       <div>Client: <strong className="text-slate-700">{displayClient}</strong></div>
                                       {!isVendorRole && sub.vendorId && (
                                          <div>Vendor: <strong className="text-slate-700">{sub.vendorId.slice(-6).toUpperCase()}</strong></div>
                                       )}
                                       <div className="text-slate-400 truncate">{cand.skills?.slice(0, 3).join(' | ') || 'Engineering Pool'}</div>
                                    </div>

                                    {/* AI and SLA Badges */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
                                       <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-100 text-[10px]">
                                          🤖 Match: {matchScore}%
                                       </Badge>
                                       <Badge variant="outline" className={`${slaInfo.color} text-[10px]`}>
                                          {slaInfo.label}
                                       </Badge>
                                    </div>
                                 </div>
                              );
                           })}
                           {stageCards.length === 0 && (
                              <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                                 No candidates
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })}
            </div>
         ) : (
            /* CANDIDATE RECOVERY CENTER */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                        <Sparkles size={24} />
                     </div>
                     <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Candidate Recovery Center</h2>
                        <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                           Don't waste candidate relationships. The Recovery Center helps vendors identify why candidates were rejected, highlights missing resume keywords, suggests skill enhancements, and allows continuous loops of resume resubmissions.
                        </p>
                     </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <Button 
                        variant="outline" 
                        className={`bg-white text-xs font-bold ${recoveryFilter === 'all' ? 'border-rose-300 text-rose-600 ring-1 ring-rose-300' : 'border-slate-200 text-slate-600'}`}
                        onClick={() => setRecoveryFilter('all')}
                     >
                        All Rejections
                     </Button>
                     <Button 
                        variant="outline" 
                        className={`bg-white text-xs font-bold ${recoveryFilter === 'resume' ? 'border-rose-300 text-rose-600 ring-1 ring-rose-300' : 'border-slate-200 text-slate-600'}`}
                        onClick={() => setRecoveryFilter('resume')}
                     >
                        Needs Resume Update
                     </Button>
                     <Button 
                        variant="outline" 
                        className={`bg-white text-xs font-bold ${recoveryFilter === 'skills' ? 'border-rose-300 text-rose-600 ring-1 ring-rose-300' : 'border-slate-200 text-slate-600'}`}
                        onClick={() => setRecoveryFilter('skills')}
                     >
                        Needs Skill Improvement
                     </Button>
                     <Button 
                        variant="outline" 
                        className={`bg-white text-xs font-bold ${recoveryFilter === 'ready' ? 'border-rose-300 text-rose-600 ring-1 ring-rose-300' : 'border-slate-200 text-slate-600'}`}
                        onClick={() => setRecoveryFilter('ready')}
                     >
                        Ready for Resubmission
                     </Button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rejectedCards.map(sub => {
                     const gap = sub.gapAnalysis || {
                        missingSkills: ['Enterprise Frameworks', 'Cloud Orchestration'],
                        missingKeywords: ['CI/CD', 'Docker', 'Kubernetes'],
                        resumeSuggestions: 'Highlight full-lifecycle backend ownership and production operations.',
                        placementProbability: 45
                     };
                     
                     const isVendorRole = checkIsVendor(userRole);
                     const displayClient = isVendorRole 
                        ? `CL-${sub.clientId?.slice(-4).toUpperCase() || '2847'}` 
                        : sub.clientName || 'Enterprise Client';

                     return (
                        <div key={sub.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-all">
                           <div>
                              <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                                 <div>
                                    <h3 className="font-bold text-slate-900 text-base">{sub.candidateName || 'Candidate'}</h3>
                                    <div className="text-xs text-rose-600 mt-1">Rejected by: {displayClient}</div>
                                 </div>
                                 <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 text-[10px] font-bold">
                                    Probability: {gap.placementProbability}%
                                 </Badge>
                              </div>

                              <div className="space-y-4">
                                 <div>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Reason for Rejection</h4>
                                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">{sub.rejectReason || 'Qualifications did not meet expectations'}</p>
                                 </div>

                                 {/* Missing Skills list */}
                                 {gap.missingSkills?.length > 0 && (
                                    <div>
                                       <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Missing Skills</h4>
                                       <div className="flex flex-wrap gap-1">
                                          {gap.missingSkills.map((s: string, idx: number) => (
                                             <span key={idx} className="bg-rose-50/50 text-rose-700 border border-rose-100/60 rounded px-1.5 py-0.5 text-[10px] font-semibold">{s}</span>
                                          ))}
                                       </div>
                                    </div>
                                 )}

                                 {/* Missing Keywords list */}
                                 {gap.missingKeywords?.length > 0 && (
                                    <div>
                                       <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Missing Keywords</h4>
                                       <div className="flex flex-wrap gap-1">
                                          {gap.missingKeywords.map((k: string, idx: number) => (
                                             <span key={idx} className="bg-amber-50/50 text-amber-700 border border-amber-100/60 rounded px-1.5 py-0.5 text-[10px] font-semibold">{k}</span>
                                          ))}
                                       </div>
                                    </div>
                                 )}

                                 {/* AI Resume Suggestions */}
                                 {gap.resumeSuggestions && (
                                    <div>
                                       <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                                          <Sparkles size={11} className="text-indigo-500" /> AI Resume Suggestion
                                       </h4>
                                       <p className="text-xs text-slate-600 bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100/40">{gap.resumeSuggestions}</p>
                                    </div>
                                 )}
                              </div>
                           </div>

                           <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] font-mono text-slate-400 uppercase">id: {sub.id.slice(-6)}</span>
                              
                              {isVendorRole && (
                                 <Button 
                                    className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs py-1.5 px-3 flex items-center gap-1 text-white"
                                    onClick={async () => {
                                       if (confirm(`Resubmit candidate ${sub.candidateName} back to Submitted stage? This will refresh their SLA timer.`)) {
                                          await handleStateTransition(sub.id, 'SUBMITTED');
                                          alert("Candidate successfully resubmitted. Welcome back to the pipeline!");
                                       }
                                    }}
                                 >
                                    <RefreshCw size={12} /> Resubmit Resume
                                 </Button>
                              )}
                           </div>
                        </div>
                     );
                  })}

                  {rejectedCards.length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-400">
                        <AlertTriangle className="mx-auto mb-2 text-slate-300" size={32} />
                        <p className="text-sm">No candidates currently require recovery under this category.</p>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* SUBMISSION DETAILS DRAWER MODAL */}
         {selectedSubmission && (() => {
            const det = selectedSubmission.interviewDetails || {};
            const cand = candidatesMap[selectedSubmission.candidateId] || {};
            const isVendorRole = checkIsVendor(userRole);
            const isAdminRole = checkIsAdmin(userRole);
            const slaInfo = getSlaIndicator(selectedSubmission.sla);

            const displayClient = isVendorRole 
               ? `CL-${selectedSubmission.clientId?.slice(-4).toUpperCase() || '2847'}` 
               : selectedSubmission.clientName || 'Enterprise Client';

            return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
               <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                     <div>
                        <h2 className="text-lg font-black tracking-tight text-slate-900">{selectedSubmission.candidateName || 'Hiring Journey'}</h2>
                        <div className="text-[10px] text-slate-500 font-bold tracking-widest mt-1 uppercase">Stage: {selectedSubmission.status || 'SUBMITTED'}</div>
                     </div>
                     <button onClick={() => setSelectedSubmission(null)} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                        <X size={18} />
                     </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-6 bg-white custom-scrollbar">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Assigned Client</div>
                           <div className="font-semibold text-slate-800 text-sm">{displayClient}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">AI Match Score</div>
                           <div className="font-semibold text-indigo-600 text-sm">{selectedSubmission.matchScore || selectedSubmission.aiFitScore || 85}%</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Current SLA Status</div>
                           <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={slaInfo.color}>{slaInfo.label}</Badge>
                              {selectedSubmission.sla && (
                                 <span className="text-xs text-slate-500 font-medium">Started: {new Date(selectedSubmission.sla.startedAt).toLocaleString()}</span>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Structural Stage logs */}
                     {selectedSubmission.rejectReason && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Rejection Reason</div>
                           <p className="text-xs text-rose-700 whitespace-pre-wrap">{selectedSubmission.rejectReason}</p>
                        </div>
                     )}

                     {det.meetingLink && (
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Active Meeting Room</div>
                           <a href={det.meetingLink} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold text-xs hover:underline flex items-center gap-1">
                              {det.meetingLink} <Navigation size={10}/>
                           </a>
                        </div>
                     )}

                     <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Candidate Overview</div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                           {cand.summary || 'Unified staff candidate in operational staffing pool.'}
                        </p>
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex flex-wrap gap-2 justify-end shrink-0">
                     <Button variant="outline" className="bg-white text-xs font-bold" onClick={() => setSelectedSubmission(null)}>Close</Button>
                     
                     {/* Client and Admin Pipeline Control Actions */}
                     {!isVendorRole && (
                        <>
                           {selectedSubmission.status === 'SUBMITTED' && (
                              <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white" onClick={() => { setSelectedSubmission(null); setShowAvailabilityForm(true); }}>
                                 <Calendar size={14} className="mr-1"/> Request Slots
                              </Button>
                           )}

                           {selectedSubmission.status === 'SHORTLISTED' && (
                              <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white" onClick={() => { setSelectedSubmission(null); setShowConfirmSchedule(true); }}>
                                 <Calendar size={14} className="mr-1"/> Schedule L1
                              </Button>
                           )}

                           {selectedSubmission.status === 'L1' && (
                              <Button className="bg-amber-500 hover:bg-amber-600 font-bold text-xs text-white" onClick={() => { setSelectedSubmission(null); setShowFeedbackForm(true); }}>
                                 <MessageSquare size={14} className="mr-1"/> L1 Feedback & Advance
                              </Button>
                           )}

                           {selectedSubmission.status === 'L2' && (
                              <div className="flex gap-1">
                                 <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white"
                                    onClick={async () => {
                                       await handleStateTransition(selectedSubmission.id, 'CLIENT_ROUND');
                                       setSelectedSubmission(null);
                                    }}
                                 >
                                    Move to Client Round
                                 </Button>
                                 <Button 
                                    className="bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white"
                                    onClick={() => {
                                       const reason = prompt("Enter rejection reason:");
                                       if (reason) {
                                          handleStateTransition(selectedSubmission.id, 'REJECTED', { rejectReason: reason });
                                          setSelectedSubmission(null);
                                       }
                                    }}
                                 >
                                    Reject
                                 </Button>
                              </div>
                           )}

                           {selectedSubmission.status === 'CLIENT_ROUND' && (
                              <div className="flex gap-1">
                                 <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white"
                                    onClick={async () => {
                                       await handleStateTransition(selectedSubmission.id, 'MANAGER_ROUND');
                                       setSelectedSubmission(null);
                                    }}
                                 >
                                    Move to Manager Round
                                 </Button>
                                 <Button 
                                    className="bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white"
                                    onClick={() => {
                                       const reason = prompt("Enter rejection reason:");
                                       if (reason) {
                                          handleStateTransition(selectedSubmission.id, 'REJECTED', { rejectReason: reason });
                                          setSelectedSubmission(null);
                                       }
                                    }}
                                 >
                                    Reject
                                 </Button>
                              </div>
                           )}

                           {selectedSubmission.status === 'MANAGER_ROUND' && (
                              <div className="flex gap-1">
                                 <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white"
                                    onClick={async () => {
                                       await handleStateTransition(selectedSubmission.id, 'HR_ROUND');
                                       setSelectedSubmission(null);
                                    }}
                                 >
                                    Move to HR Round
                                 </Button>
                                 <Button 
                                    className="bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white"
                                    onClick={() => {
                                       const reason = prompt("Enter rejection reason:");
                                       if (reason) {
                                          handleStateTransition(selectedSubmission.id, 'REJECTED', { rejectReason: reason });
                                          setSelectedSubmission(null);
                                       }
                                    }}
                                 >
                                    Reject
                                 </Button>
                              </div>
                           )}

                           {selectedSubmission.status === 'HR_ROUND' && (
                              <div className="flex gap-1">
                                 <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white"
                                    onClick={async () => {
                                       await handleStateTransition(selectedSubmission.id, 'OFFER');
                                       setSelectedSubmission(null);
                                    }}
                                 >
                                    Move to Offer
                                 </Button>
                                 <Button 
                                    className="bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white"
                                    onClick={() => {
                                       const reason = prompt("Enter rejection reason:");
                                       if (reason) {
                                          handleStateTransition(selectedSubmission.id, 'REJECTED', { rejectReason: reason });
                                          setSelectedSubmission(null);
                                       }
                                    }}
                                 >
                                    Reject
                                 </Button>
                              </div>
                           )}

                           {selectedSubmission.status === 'OFFER' && (
                              <div className="flex gap-1">
                                 <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white"
                                    onClick={async () => {
                                       await handleStateTransition(selectedSubmission.id, 'JOINED');
                                       setSelectedSubmission(null);
                                    }}
                                 >
                                    Confirm Joined
                                 </Button>
                                 <Button 
                                    className="bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white"
                                    onClick={() => {
                                       const reason = prompt("Enter rejection reason:");
                                       if (reason) {
                                          handleStateTransition(selectedSubmission.id, 'REJECTED', { rejectReason: reason });
                                          setSelectedSubmission(null);
                                       }
                                    }}
                                 >
                                    Reject
                                 </Button>
                              </div>
                           )}

                           {selectedSubmission.status === 'JOINED' && (
                              <Button 
                                 className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white"
                                 onClick={async () => {
                                    await handleStateTransition(selectedSubmission.id, 'CLOSED');
                                    setSelectedSubmission(null);
                                 }}
                              >
                                 Complete Placement & Close
                              </Button>
                           )}
                        </>
                     )}
                  </div>
               </div>
            </div>
            );
         })()}

         {/* OTHER MODALS */}
         {showAvailabilityForm && (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                  <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                     <Calendar className="text-indigo-500" /> Provide Availability
                  </h3>
                  <div className="text-xs text-slate-500 mb-4">Suggest available dates and times for the interview.</div>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                     {availabilitySlots.map((slot, idx) => (
                        <div key={idx} className="flex gap-2">
                           <input type="date" value={slot.date} onChange={(e) => {
                              const newSlots = [...availabilitySlots];
                              newSlots[idx].date = e.target.value;
                              setAvailabilitySlots(newSlots);
                           }} className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                           <input type="time" value={slot.time} onChange={(e) => {
                              const newSlots = [...availabilitySlots];
                              newSlots[idx].time = e.target.value;
                              setAvailabilitySlots(newSlots);
                           }} className="w-32 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                           <Button variant="outline" className="px-3" onClick={() => setAvailabilitySlots(availabilitySlots.filter((_, i) => i !== idx))}>
                              <Plus size={16} className="rotate-45" />
                           </Button>
                        </div>
                     ))}
                  </div>
                  <Button variant="outline" className="w-full mt-3 bg-slate-50 border-dashed text-xs" onClick={() => setAvailabilitySlots([...availabilitySlots, { date: '', time: '' }])}>
                     <Plus size={16} className="mr-2"/> Add Slot
                  </Button>
                  
                  <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                     <Button variant="outline" className="flex-1 text-xs font-bold" onClick={() => setShowAvailabilityForm(false)}>Cancel</Button>
                     <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white" onClick={submitAvailability}>Submit Availability</Button>
                  </div>
               </div>
            </div>
         )}

         {showConfirmSchedule && (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                  <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                     <CheckCircle className="text-indigo-500" /> Confirm Schedule
                  </h3>
                  
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Date</label>
                           <input type="date" value={confirmSlot.date} onChange={e => setConfirmSlot({...confirmSlot, date: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Time</label>
                           <input type="time" value={confirmSlot.time} onChange={e => setConfirmSlot({...confirmSlot, time: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Meeting Link</label>
                        <input type="url" placeholder="https://zoom.us/j/..." value={confirmSlot.meetingLink} onChange={e => setConfirmSlot({...confirmSlot, meetingLink: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                     </div>
                  </div>

                  <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                     <Button variant="outline" className="flex-1 text-xs font-bold" onClick={() => setShowConfirmSchedule(false)}>Cancel</Button>
                     <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white" onClick={confirmSchedule}>Confirm Interview</Button>
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
                           <option value="Proceed">Proceed (Pass L1 & Move to L2)</option>
                           <option value="Reject">Reject (Send to Recovery Center)</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Structured Feedback Notes</label>
                        <textarea 
                           value={feedback.notes} 
                           onChange={e => setFeedback({...feedback, notes: e.target.value})}
                           placeholder="Describe candidate technical, communication strengths or gaps..."
                           className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                        ></textarea>
                     </div>
                     <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <Button variant="outline" className="flex-1 text-xs font-bold" onClick={() => setShowFeedbackForm(false)}>Cancel</Button>
                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white" onClick={submitFeedback}>Submit Feedback</Button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
