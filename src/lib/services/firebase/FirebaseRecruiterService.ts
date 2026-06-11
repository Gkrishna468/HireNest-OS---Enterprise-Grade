import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { IRecruiterService } from '../contracts/IRecruiterService';
import { Recruiter, RecruiterInput, RecruiterUpdate } from '../../../types/Recruiter';

export class FirebaseRecruiterService implements IRecruiterService {
  private collectionName = 'recruiters';

  async getRecruiter(id: string): Promise<Recruiter | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Recruiter;
    }
    return null;
  }

  async createRecruiter(data: RecruiterInput): Promise<Recruiter> {
    const docRef = doc(collection(db, this.collectionName));
    const newDoc = { ...data };
    await setDoc(docRef, newDoc);
    return { id: docRef.id, ...newDoc } as Recruiter;
  }

  async updateRecruiter(id: string, updates: RecruiterUpdate): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, updates as { [x: string]: any });
  }

  async archiveRecruiter(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { isArchived: true });
  }
}
