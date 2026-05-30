import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Users, AlignLeft } from 'lucide-react';
import { Button } from '../../lib/Button';
import { db } from '../../lib/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export function InterviewSchedulerModal({ submission, requirement, onClose }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    round: 'Technical Round 1',
    date: '',
    time: '',
    interviewer: '',
    mode: 'Teams',
    notes: ''
  });

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!formData.date || !formData.time || !formData.interviewer) {
      alert("Please fill date, time, and interviewer.");
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
           currentStage: "Deal Room Active",
           identitiesRevealed: false,
           createdAt: serverTimestamp(),
           matchData: { matchScore: submission.matchScore || 0 }
         });
         await updateDoc(doc(db, "submissions", submission.id), {
           dealRoomId: roomId
         });
      }

      // 2. Create Interview Record linked to submission
      await addDoc(collection(db, "interviews"), {
        submissionId: submission.id,
        candidateId: submission.candidateId,
        requirementId: requirement.id,
        dealRoomId: roomId,
        round: formData.round,
        date: formData.date,
        time: formData.time,
        interviewer: formData.interviewer,
        mode: formData.mode,
        notes: formData.notes,
        status: "SCHEDULED",
        createdAt: serverTimestamp()
      });

      // 3. Add system message to Deal Room
      await addDoc(collection(db, "dealRooms", roomId, "messages"), {
         senderRole: "System",
         senderId: "system",
         type: "system",
         text: `📅 INTERVIEW SCHEDULED: ${formData.round} on ${formData.date} at ${formData.time}. Mode: ${formData.mode}. Interviewer: ${formData.interviewer}.`,
         timestamp: serverTimestamp()
      });

      // 4. Update deal room stage if needed
      await updateDoc(doc(db, "dealRooms", roomId), {
         currentStage: "technical_l1",
         updatedAt: serverTimestamp()
      });
      
      // 5. Send notifications
      const notifBase = {
        title: "Interview Scheduled",
        message: `${formData.round} for ${submission.candidateName} on ${formData.date} at ${formData.time}`,
        type: "INTERVIEW",
        createdAt: serverTimestamp(),
        read: false
      };
      
      // Client Notification
      await addDoc(collection(db, "notifications"), {
        ...notifBase, recipientId: requirement.clientId, actionUrl: `/deal-rooms?view=interviews`
      });
      // Vendor Notification
      await addDoc(collection(db, "notifications"), {
        ...notifBase, recipientId: submission.vendorId || submission.vendorOrgId, actionUrl: `/deal-rooms?view=interviews`
      });

      alert("Interview Scheduled successfully!");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error scheduling interview.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><Calendar size={20}/> Schedule Interview</h2>
            <p className="text-slate-400 text-xs font-medium mt-1">for {submission.candidateName || 'Candidate'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
           
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interview Round</label>
              <select name="round" value={formData.round} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
                 <option>Introductory Call</option>
                 <option>Technical Round 1</option>
                 <option>Technical Round 2</option>
                 <option>Final Round</option>
                 <option>HR Round</option>
              </select>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Date</label>
                 <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Time</label>
                 <input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Users size={12}/> Interviewer(s)</label>
              <input type="text" name="interviewer" placeholder="e.g. Jane Doe" value={formData.interviewer} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Video size={12}/> Mode</label>
              <select name="mode" value={formData.mode} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
                 <option>Teams</option>
                 <option>Google Meet</option>
                 <option>Zoom</option>
                 <option>Webex</option>
                 <option>In-Person</option>
              </select>
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><AlignLeft size={12}/> Notes</label>
              <textarea name="notes" placeholder="Any specific instructions..." value={formData.notes} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={3}></textarea>
           </div>

        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <Button onClick={onClose} disabled={isProcessing} variant="outline" className="text-slate-600">Cancel</Button>
          <Button onClick={handleSave} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            {isProcessing ? 'Saving...' : 'Save & Notify'}
          </Button>
        </div>

      </div>
    </div>
  );
}
