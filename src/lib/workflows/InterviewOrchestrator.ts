import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

export type InterviewStage = 
  | 'REQUESTED'
  | 'AVAILABILITY_PENDING'
  | 'SCHEDULING'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'FEEDBACK_PENDING'
  | 'DECISION_PENDING';

export interface InterviewRequest {
  submissionId: string;
  candidateId: string;
  requirementId: string;
  dealRoomId: string;
  clientId: string;
  vendorId: string;
  roundName: string; // e.g. "Technical Round 1", "HR Round"
  interviewerId?: string;
  interviewerName?: string;
  requestedDates?: string[];
}

export class InterviewOrchestrator {
  
  /**
   * 1. Action: Client requests an interview
   * Status change: SUBMITTED or SHORTLISTED -> INTERVIEW_REQUESTED
   */
  static async requestInterview(req: InterviewRequest) {
    // We would create an interview document in 'interviews' collection
    const interviewRef = await addDoc(collection(db, "interviews"), {
      ...req,
      status: 'AVAILABILITY_PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update Submission Status
    await updateDoc(doc(db, "submissions", req.submissionId), {
      status: 'INTERVIEW_REQUESTED',
      updatedAt: serverTimestamp()
    });

    // Add to deal room activity ledger
    if (req.dealRoomId) {
      await addDoc(collection(db, "dealRooms", req.dealRoomId, "messages"), {
        type: 'event',
        text: `Interview Requested: ${req.roundName}. Waiting for candidate availability.`,
        senderId: 'system',
        senderRole: 'System',
        timestamp: serverTimestamp()
      });
    }

    return interviewRef.id;
  }

  /**
   * 2. Action: Vendor/Candidate provides available slots
   * Status change: AVAILABILITY_PENDING -> SCHEDULING
   */
  static async provideAvailability(interviewId: string, submissionId: string, availableSlots: any[]) {
    await updateDoc(doc(db, "interviews", interviewId), {
      status: 'SCHEDULING',
      availableSlots,
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "submissions", submissionId), {
       status: 'INTERVIEW_AVAILABLE', // Intermediate status
       updatedAt: serverTimestamp()
    });
  }

  /**
   * 3. Action: Recruiter/Client locks in schedule
   * Status change: SCHEDULING -> SCHEDULED
   */
  static async scheduleInterview(interviewId: string, submissionId: string, finalSlot: any) {
    await updateDoc(doc(db, "interviews", interviewId), {
      status: 'SCHEDULED',
      scheduledDate: finalSlot.date,
      scheduledTime: finalSlot.time,
      meetingLink: finalSlot.meetingLink,
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "submissions", submissionId), {
      status: 'INTERVIEW_SCHEDULED',
      updatedAt: serverTimestamp()
    });
  }

  // Future phases: feedback collection, next round logic, offer flow
}
