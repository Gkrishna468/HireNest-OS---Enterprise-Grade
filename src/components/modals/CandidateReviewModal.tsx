import React, { useState } from 'react';
import { X, Check, XCircle, FileText, Calendar, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { Button } from '../../lib/Button';
import { db, auth } from '../../lib/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export function CandidateReviewModal({ submission, requirement, onClose, onSchedule }: any) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleShortlist = async () => {
    setIsProcessing(true);
    try {
      if (submission.sysSource === 'SUBMISSION') {
        await updateDoc(doc(db, "submissions", submission.id), {
          status: "SHORTLISTED"
        });
      } else {
        const { SubmissionOrchestrator } = await import("../../lib/workflows/SubmissionOrchestrator");
        await SubmissionOrchestrator.submitCandidate({
          candidateData: {
            id: submission.candidateId || submission.id,
            name: submission.candidateName || submission.name || "Anonymous Candidate"
          },
          requirementId: requirement.id,
          clientId: requirement.clientId || "ORG-LOCAL",
          vendorId: submission.vendorId || "ORG-EXTERNAL-VENDOR",
          submitterId: auth.currentUser?.uid || "system",
          initialStatus: "SHORTLISTED",
          matchScore: submission.matchScore || 0
        });
      }
      alert("Candidate shortlisted successfully.");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error shortlisting candidate.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      if (submission.sysSource === 'SUBMISSION') {
        await updateDoc(doc(db, "submissions", submission.id), {
          status: "REJECTED"
        });
      } else {
        const { SubmissionOrchestrator } = await import("../../lib/workflows/SubmissionOrchestrator");
        await SubmissionOrchestrator.submitCandidate({
          candidateData: {
            id: submission.candidateId || submission.id,
            name: submission.candidateName || submission.name || "Anonymous Candidate"
          },
          requirementId: requirement.id,
          clientId: requirement.clientId || "ORG-LOCAL",
          vendorId: submission.vendorId || "ORG-EXTERNAL-VENDOR",
          submitterId: auth.currentUser?.uid || "system",
          initialStatus: "REJECTED",
          matchScore: submission.matchScore || 0
        });
      }
      alert("Candidate rejected.");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error rejecting candidate.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDealRoom = async () => {
    setIsProcessing(true);
    try {
      if (submission.dealRoomId) {
         // Already has a deal room
         window.location.href = "/deal-rooms"; 
      } else {
         const roomId = "DR-" + Math.random().toString(36).substr(2, 9);
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
           currentStage: "shortlisted",
           identitiesRevealed: false,
           createdAt: serverTimestamp(),
           matchData: { matchScore: submission.matchScore || 0 }
         });
         await updateDoc(doc(db, "submissions", submission.id), {
           dealRoomId: roomId
         });
         alert("Deal Room created successfully.");
         onClose();
      }
    } catch (e) {
       console.error(e);
       alert("Error creating Deal Room.");
    } finally {
       setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h2 className="text-2xl font-black">{submission.candidateName || 'Anonymous Profile'}</h2>
               <Badge className="bg-indigo-500 text-white border-0">{submission.matchScore}% Match</Badge>
            </div>
            <div className="text-slate-400 text-sm font-medium flex gap-4">
               <span>ID: {submission.candidateId?.slice(0,8) || 'N/A'}</span>
               <span>Vendor: {submission.vendorName || 'Vendor Not Linked'}</span>
               <span>Status: {submission.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50">
           
           {/* Resume & Analysis */}
           <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={16} className="text-indigo-600"/> Resume Snapshot</h3>
                 <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                    {submission.resumeText || "No resume text available."}
                 </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><LinkIcon size={16} className="text-indigo-600"/> Skills Matrix</h3>
                 <div className="flex flex-wrap gap-2">
                    {submission.skills ? (
                        Array.isArray(submission.skills) ? submission.skills.map((s: string, i: number) => <Badge key={i} variant="outline">{s}</Badge>) :
                        submission.skills.split(',').map((s: string, i: number) => <Badge key={i} variant="outline">{s}</Badge>)
                    ) : <span className="text-slate-400 text-sm">No skills explicitly defined.</span>}
                 </div>
              </div>
           </div>

           {/* Requirement Match */}
           <div className="space-y-6">
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                 <h3 className="font-bold text-indigo-900 mb-4">Match Analysis against {requirement.title}</h3>
                 <div className="space-y-4">
                    <div>
                       <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Required Experience</div>
                       <div className="text-sm font-semibold text-indigo-900">{requirement.experience || 'Not specified'}</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap gap-3 shrink-0">
          <Button onClick={handleShortlist} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 md:flex-none">
            <Check size={16} className="mr-2"/> Shortlist
          </Button>
          <Button onClick={handleReject} disabled={isProcessing} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 font-bold flex-1 md:flex-none">
            <XCircle size={16} className="mr-2"/> Reject
          </Button>
          <Button onClick={handleOpenDealRoom} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex-1 md:flex-none">
            <MessageSquare size={16} className="mr-2"/> Open Deal Room
          </Button>
          <Button onClick={() => onSchedule(submission)} disabled={isProcessing} className="bg-slate-900 hover:bg-black text-white font-bold flex-1 md:flex-none">
            <Calendar size={16} className="mr-2"/> Schedule
          </Button>
        </div>

      </div>
    </div>
  );
}
