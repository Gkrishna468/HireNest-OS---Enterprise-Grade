import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ISubmissionService } from '../contracts/ISubmissionService';
import { Submission, SubmissionInput } from '../../../types/Submission';
import { EventDispatcher } from '../../../events/EventDispatcher';
import { EventTypes } from '../../events/EventTypes';

export class FirebaseSubmissionService implements ISubmissionService {
  private collectionName = 'submissions';

  async getSubmission(id: string): Promise<Submission | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Submission;
    }
    return null;
  }

  async createSubmission(data: SubmissionInput): Promise<Submission> {
    const docRef = doc(collection(db, this.collectionName));
    const newDoc = { ...data };
    await setDoc(docRef, newDoc);
    
    // Emit SUBMISSION_CREATED to trigger AnalyticsEventHandler
    EventDispatcher.getInstance().publish({
      id: docRef.id,
      type: EventTypes.SUBMISSION_CREATED,
      tenantId: data.vendorId || 'system',
      timestamp: new Date().toISOString(),
      payload: { submissionId: docRef.id, ...newDoc }
    });

    return { id: docRef.id, ...newDoc } as Submission;
  }

  async updateSubmission(id: string, updates: Partial<Record<string, any>>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, updates);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { status });

    if (status === 'REJECTED' || status === 'REJECT') {
       EventDispatcher.getInstance().publish({
         id,
         type: 'CANDIDATE_REJECTED' as any,
         tenantId: 'system',
         timestamp: new Date().toISOString(),
         payload: { submissionId: id, newStatus: status }
       });
    } else if (status === 'SHORTLISTED' || status === 'INTERVIEW_REQUESTED') {
       EventDispatcher.getInstance().publish({
         id,
         type: 'SUBMISSION_ADVANCED' as any,
         tenantId: 'system',
         timestamp: new Date().toISOString(),
         payload: { submissionId: id, newStatus: status }
       });
    } else if (status === 'PLACED' || status === 'PLACEMENT_CLOSED') {
       EventDispatcher.getInstance().publish({
         id,
         type: 'PLACEMENT_CLOSED' as any,
         tenantId: 'system',
         timestamp: new Date().toISOString(),
         payload: { submissionId: id, newStatus: status }
       });
    }
  }

  async updateInterviewEvent(id: string, event: Record<string, any>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    
    const updates: Record<string, any> = {};
    if (event.interviewStatus) updates.interviewStatus = event.interviewStatus;
    if (event.interviewFeedback) updates.interviewFeedback = event.interviewFeedback;
    
    if (event.isNewRound) {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        updates.interviewRounds = (data.interviewRounds || 0) + 1;
      }
    }
    
    await updateDoc(docRef, updates);

    if (event.interviewStatus === 'INTERVIEW_SCHEDULED') {
       EventDispatcher.getInstance().publish({
         id,
         type: EventTypes.INTERVIEW_SCHEDULED,
         tenantId: 'system',
         timestamp: new Date().toISOString(),
         payload: { submissionId: id, status: 'INTERVIEW_SCHEDULED' }
       });
    }
  }

  async updateOfferStatus(id: string, offerStatus: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { offerStatus });
  }

  async updateJoiningStatus(id: string, joiningStatus: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { joiningStatus });
  }
}
