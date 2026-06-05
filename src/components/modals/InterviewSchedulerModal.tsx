import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Users, AlignLeft, Globe, Link } from 'lucide-react';
import { Button } from '../../lib/Button';
import { db } from '../../lib/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export function InterviewSchedulerModal({ submission, requirement, isClientAction = false, onClose }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
   const [formData, setFormData] = useState({
    round: 'INTERVIEW_ROUND_1',
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
      // 1. Create Deal Room if one doesn't exist
      let roomId = submission.dealRoomId;
      if (!roomId) {
         roomId = "DR-" + Math.random().toString(36).substr(2, 9);
         await addDoc(collection(db, "dealRooms"), {
           id: roomId,
           requirementId: requirement.id,
           candidateId: submission.candidateId,
           vendorId: submission.vendorId,
           clientId: requirement.clientId,
           clientName: requirement.clientName || 'Client',
           vendorName: submission.vendorName || 'Vendor',
           candidateName: submission.candidateName || 'Anonymous',
           jobTitle: requirement.title || "Strategic Role",
           experience: requirement.experience || "Not Specified",
           status: "ACTIVE",
           currentStage: formData.round,
           identitiesRevealed: false,
           createdAt: serverTimestamp(),
           matchData: { matchScore: submission.matchScore || 0 }
         });
      }

      const targetStatus = isClientAction ? 'INTERVIEW_REQUESTED' : 'INTERVIEW_SCHEDULED';

      // 2. Update Submission Status
      await updateDoc(doc(db, "submissions", submission.id), {
        dealRoomId: roomId,
        status: targetStatus
      });

      // 3. Create Interview Record linked to submission
      await addDoc(collection(db, "interviews"), {
        submissionId: submission.id,
        candidateId: submission.candidateId,
        candidateName: submission.candidateName || 'Anonymous',
        requirementId: requirement.id,
        dealRoomId: roomId,
        round: formData.round,
        date: formData.date,
        time: formData.time || '',
        startTime: formData.time ? `${formData.date}T${formData.time}` : null,
        endTime: formData.endTime ? `${formData.date}T${formData.endTime}` : null,
        timezone: formData.timezone,
        calendarProvider: formData.mode,
        meetingLink: formData.meetingLink,
        interviewer: formData.interviewer,
        mode: formData.mode,
        notes: formData.notes,
        status: isClientAction ? "REQUESTED" : "SCHEDULED",
        createdAt: serverTimestamp()
      });

      // 4. Add system message to Deal Room
      await addDoc(collection(db, "dealRooms", roomId, "messages"), {
         senderRole: "System",
         senderId: "system",
         type: "system",
         text: isClientAction 
            ? `📅 INTERVIEW REQUESTED: ${formData.round} preferred on ${formData.date}. Panel: ${formData.interviewer}. Waiting for vendor availability.`
            : `📅 INTERVIEW SCHEDULED: ${formData.round} on ${formData.date} at ${formData.time} ${formData.timezone}. Mode: ${formData.mode}. Interviewer: ${formData.interviewer}.`,
         timestamp: serverTimestamp()
      });

      // 5. Send notifications
      const notifBase = {
        title: isClientAction ? "Interview Requested" : "Interview Scheduled",
        message: `${formData.round} for ${submission.candidateName} on ${formData.date}`,
        type: "INTERVIEW",
        createdAt: serverTimestamp(),
        read: false
      };
      
      // Client Notification
      if (requirement.clientId) {
         await addDoc(collection(db, "notifications"), {
           ...notifBase, recipientId: requirement.clientId, actionUrl: `/deal-rooms?view=interviews`
         });
      }
      // Vendor Notification
      if (submission.vendorId || submission.vendorOrgId) {
         await addDoc(collection(db, "notifications"), {
           ...notifBase, recipientId: submission.vendorId || submission.vendorOrgId, actionUrl: `/deal-rooms?view=interviews`
         });
      }

      alert(isClientAction ? "Interview Requested successfully!" : "Interview Scheduled successfully!");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error processing interview.");
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
              <select name="round" value={formData.round} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                 <option value="INTERVIEW_ROUND_1">Technical Round 1</option>
                 <option value="INTERVIEW_ROUND_2">Technical Round 2</option>
                 <option value="CULTURAL_ROUND">Cultural / HR Round</option>
                 <option value="FINAL_INTERVIEW">Final Interview</option>
              </select>
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
