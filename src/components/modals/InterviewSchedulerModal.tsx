import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Users, AlignLeft, Globe, Link } from 'lucide-react';
import { Button } from '../../lib/Button';
import { useSubmissionStore } from '../../stores/SubmissionStore';

export function InterviewSchedulerModal({ submission, requirement, isClientAction = false, onClose }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { updateInterviewEvent, requestInterview } = useSubmissionStore();
   const [formData, setFormData] = useState({
    round: 'Technical Round 1',
    date: '', // used as preferred date or exact date
    time: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    interviewer: '',
    mode: 'Teams',
    meetingLink: '',
    notes: ''
  });

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!formData.date || !formData.interviewer) {
      alert("Please fill date and interviewer.");
      return;
    }
    
    setIsProcessing(true);
    try {
      if (submission && submission.id) {
         if (isClientAction) {
            await requestInterview(submission.id, {
               interviewStatus: "INTERVIEW_REQUESTED",
               isNewRound: true,
               interviewDetails: formData,
               submissionId: submission.id,
               candidateId: submission.candidateId,
               requirementId: submission.requirementId,
               clientId: submission.clientId,
               vendorId: submission.vendorId,
               dealRoomId: submission.dealRoomId || `DR-${submission.id}`,
               round: formData.round,
               interviewer: formData.interviewer,
               date: formData.date
            });
         } else {
            await updateInterviewEvent(submission.id, {
               interviewStatus: "INTERVIEW_SCHEDULED",
               interviewFeedback: "",
               isNewRound: true,
               interviewDetails: formData
            });
         }
      }
      alert(isClientAction ? "Interview Requested successfully!" : "Interview Scheduled successfully!");
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

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Video size={12}/> Mode / Provider</label>
                 <select name="mode" value={formData.mode} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>Teams</option>
                    <option>Google Meet</option>
                    <option>Zoom</option>
                    <option>Webex</option>
                    <option>In-Person</option>
                 </select>
              </div>
              {!isClientAction && (
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
