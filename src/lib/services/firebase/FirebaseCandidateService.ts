import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ICandidateService } from '../contracts/ICandidateService';
import { Candidate, CandidateInput, CandidateUpdate } from '../../../types/Candidate';

export class FirebaseCandidateService implements ICandidateService {
  private collectionName = 'candidates';

  async getCandidate(id: string): Promise<Candidate | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Candidate;
    }
    return null;
  }

  async createCandidate(data: CandidateInput): Promise<Candidate> {
    const docRef = doc(collection(db, this.collectionName));
    const newDoc = { ...data };
    await setDoc(docRef, newDoc);
    return { id: docRef.id, ...newDoc } as Candidate;
  }

  async updateCandidate(id: string, updates: CandidateUpdate): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, updates as { [x: string]: any });
  }

  async archiveCandidate(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { isArchived: true });
  }
}
