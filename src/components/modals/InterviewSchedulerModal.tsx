import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Users, AlignLeft, Globe, Link, Sparkles, Mail } from 'lucide-react';
import { Button } from '../../lib/Button';
import { useSubmissionStore } from '../../stores/SubmissionStore';
import { auth } from '../../lib/firebase';

// Helper to convert local date-time and timezone into an offset-correct ISO string
function getISOStringWithOffset(dateStr: string, timeStr: string, timezone: string): string {
  const localDateTime = `${dateStr}T${timeStr}:00`;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const utcDate = new Date(localDateTime + 'Z');
    const parts = formatter.formatToParts(utcDate);
    const partObj = parts.reduce((acc: any, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    
    const localInTZ = new Date(Date.UTC(
      parseInt(partObj.year),
      parseInt(partObj.month) - 1,
      parseInt(partObj.day),
      parseInt(partObj.hour === '24' ? '00' : partObj.hour),
      parseInt(partObj.minute),
      parseInt(partObj.second)
    ));
    
    const offsetMs = utcDate.getTime() - localInTZ.getTime();
    const finalDate = new Date(utcDate.getTime() + offsetMs);
    
    const offsetMinutes = Math.abs(offsetMs) / (60 * 1000);
    const offsetHours = Math.floor(offsetMinutes / 60);
    const remMinutes = offsetMinutes % 60;
    const sign = offsetMs <= 0 ? '+' : '-';
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const isoWithoutZ = finalDate.toISOString().replace('Z', '');
    return `${isoWithoutZ.substring(0, 19)}${sign}${pad(offsetHours)}:${pad(remMinutes)}`;
  } catch (err) {
    return `${localDateTime}Z`;
  }
}

export function InterviewSchedulerModal({ submission, requirement, isClientAction = false, onClose }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  const { updateInterviewEvent, requestInterview } = useSubmissionStore();
  const [formData, setFormData] = useState({
    round: 'Technical Round 1',
    date: '', 
    time: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    interviewer: '',
    interviewerEmail: '',
    mode: 'Google Meet',
    meetingLink: '',
    notes: ''
  });

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear availability status if time changes
    if (e.target.name === 'time' || e.target.name === 'date' || e.target.name === 'endTime') {
      setAvailabilityStatus(null);
    }
  };

  const checkAvailability = async () => {
    if (!formData.date || !formData.time) {
      alert("Please select a date and start time first.");
      return;
    }
    setCheckingAvailability(true);
    setAvailabilityStatus(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You must be logged in to check calendar availability.");
      }
      
      const startISO = getISOStringWithOffset(formData.date, formData.time, formData.timezone);
      const endISO = getISOStringWithOffset(formData.date, formData.endTime || formData.time, formData.timezone);
      
      // Call our freebusy proxy endpoint
      const res = await fetch(`/api/google/calendar/freebusy?timeMin=${encodeURIComponent(startISO)}&timeMax=${encodeURIComponent(endISO)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || result.error || "Calendar connection check failed.");
      }

      const primaryCal = result.calendars?.primary || {};
      const busyTimes = primaryCal.busy || [];
      if (busyTimes.length > 0) {
        setAvailabilityStatus("⚠️ CONFLICT: Recruiter calendar is busy at this time.");
      } else {
        setAvailabilityStatus("✅ AVAILABLE: Time slot is open on Google Calendar.");
      }
    } catch (e: any) {
      console.warn("Availability check error:", e.message);
      if (e.message?.includes("connection") || e.message?.includes("OAuth") || e.message?.includes("connect")) {
        setAvailabilityStatus("❌ Google Calendar is not connected. Connect in Settings -> Integrations.");
      } else {
        setAvailabilityStatus("❌ Calendar credentials expired. Please reconnect in Settings.");
      }
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSave = async () => {
    if (!formData.date || !formData.interviewer) {
      alert("Please fill in the date and interviewer name.");
      return;
    }
    
    setIsProcessing(true);
    const actualSubId = submission.submissionId || submission.id;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You must be logged in to schedule an interview.");
      }

      console.log("[InterviewSchedulerModal] Submitting interview proposal to backend...");
      
      // 1. Submit through backend REST API
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submission,
          requirement,
          isClientAction,
          formData
        })
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to schedule interview.");
      }

      console.log("[InterviewSchedulerModal] Backend scheduled successfully:", data);

      // 2. Fallback to store to synchronize local state
      if (submission && actualSubId) {
         if (isClientAction) {
            await requestInterview(actualSubId, {
               interviewStatus: "INTERVIEW_REQUESTED",
               isNewRound: true,
               interviewDetails: {
                 ...formData,
                 meetingLink: data.meetingLink || formData.meetingLink
               },
               submissionId: actualSubId,
               candidateId: submission.candidateId,
               requirementId: submission.requirementId,
               clientId: submission.clientId,
               vendorId: submission.vendorId,
               dealRoomId: submission.dealRoomId || `DR-${actualSubId}`,
               round: formData.round,
               interviewer: formData.interviewer,
               date: formData.date
            });
         } else {
            await updateInterviewEvent(actualSubId, {
               interviewStatus: "INTERVIEW_SCHEDULED",
               interviewFeedback: "",
               isNewRound: true,
               interviewDetails: {
                 ...formData,
                 meetingLink: data.meetingLink || formData.meetingLink
               }
            });
         }
      }

      alert(isClientAction ? "Interview requested successfully!" : "Interview scheduled successfully and Google Calendar updated!");
      onClose();
    } catch (e: any) {
      console.error(e);
      alert("Error processing interview: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><Calendar size={20}/> {isClientAction ? 'Request Interview' : 'Schedule Interview'}</h2>
            <p className="text-slate-400 text-xs font-medium mt-1">for {submission.candidateName || 'Candidate'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
           
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Round / Type</label>
              <input type="text" list="round-options" name="round" value={formData.round} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Technical Round 1" />
              <datalist id="round-options">
                 <option value="Technical Round 1" />
                 <option value="Technical Round 2" />
                 <option value="Technical Round 3" />
                 <option value="Cultural / HR Round" />
                 <option value="Final Interview" />
              </datalist>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> {isClientAction ? 'Preferred Date' : 'Date'}</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {!isClientAction ? (
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Start Time</label>
                       <input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> End Time</label>
                       <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                 </div>
              ) : (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Preferred Time</label>
                    <input type="text" name="time" placeholder="e.g. Any time after 2 PM EST" value={formData.time} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
              )}
           </div>

           {/* Google Calendar Availability Trigger */}
           {!isClientAction && formData.mode === "Google Meet" && (
             <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
               <div className="flex justify-between items-center">
                 <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                   <Sparkles size={14} className="text-amber-500" /> Google Calendar Integration
                 </span>
                 <button 
                   type="button"
                   onClick={checkAvailability}
                   disabled={checkingAvailability}
                   className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors disabled:opacity-50"
                 >
                   {checkingAvailability ? 'Checking...' : 'Check Availability'}
                 </button>
               </div>
               {availabilityStatus && (
                 <div className="text-xs font-medium mt-1 p-2 bg-white rounded-lg border border-slate-100">
                   {availabilityStatus}
                 </div>
               )}
             </div>
           )}

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Globe size={12}/> Timezone</label>
                 <input type="text" name="timezone" placeholder="e.g. America/New_York" value={formData.timezone} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Users size={12}/> {isClientAction ? 'Panel Members' : 'Interviewer(s)'}</label>
                 <input type="text" name="interviewer" placeholder="e.g. Jane Doe" value={formData.interviewer} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
           </div>

           {/* Interviewer Email input */}
           {!isClientAction && (
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                 <Mail size={12}/> Interviewer Email (for Calendar Invitation)
               </label>
               <input 
                 type="email" 
                 name="interviewerEmail" 
                 placeholder="e.g. interviewer@company.com" 
                 value={formData.interviewerEmail} 
                 onChange={handleChange} 
                 className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" 
               />
             </div>
           )}

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Video size={12}/> Mode / Provider</label>
                 <select name="mode" value={formData.mode} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Google Meet">Google Meet</option>
                    <option value="Teams">Teams</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Webex">Webex</option>
                    <option value="In-Person">In-Person</option>
                 </select>
              </div>
              {!isClientAction && formData.mode !== "Google Meet" && (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Link size={12}/> Meeting Link</label>
                    <input type="url" name="meetingLink" placeholder="https://..." value={formData.meetingLink} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
              )}
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><AlignLeft size={12}/> {isClientAction ? 'Notes for Vendor' : 'Preparation Notes'}</label>
              <textarea name="notes" placeholder="Any specific instructions..." value={formData.notes} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={3}></textarea>
           </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <Button onClick={onClose} disabled={isProcessing} variant="outline" className="text-slate-600 bg-white">Cancel</Button>
          <Button onClick={handleSave} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
            {isProcessing ? 'Processing...' : (isClientAction ? 'Request Interview' : 'Book & Notify')}
          </Button>
        </div>

      </div>
    </div>
  );
}
