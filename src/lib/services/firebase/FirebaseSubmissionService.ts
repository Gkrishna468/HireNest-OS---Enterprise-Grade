import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ISubmissionService } from '../contracts/ISubmissionService';
import { Submission, SubmissionInput } from '../../../types/Submission';

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
    return { id: docRef.id, ...newDoc } as Submission;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { status });
  }

  async updateInterviewEvent(id: string, event: Record<string, any>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    
    const updates: Record<string, any> = {};
    if (event.interviewStatus) updates.interviewStatus = event.interviewStatus;
    if (event.interviewFeedback) updates.interviewFeedback = event.interviewFeedback;
    
    // Increment rounds if applicable. This is simplified, can be expanded.
    if (event.isNewRound) {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        updates.interviewRounds = (data.interviewRounds || 0) + 1;
      }
    }
    
    await updateDoc(docRef, updates);
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
