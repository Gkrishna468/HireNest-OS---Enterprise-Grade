import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { IRequirementService } from '../contracts/IRequirementService';
import { Requirement, RequirementInput, RequirementUpdate } from '../../../types/Requirement';

export class FirebaseRequirementService implements IRequirementService {
  private collectionName = 'requirements';

  async getRequirement(id: string): Promise<Requirement | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Requirement;
    }
    return null;
  }

  async createRequirement(data: RequirementInput): Promise<Requirement> {
    const docRef = doc(collection(db, this.collectionName));
    const newDoc = { ...data };
    await setDoc(docRef, newDoc);
    return { id: docRef.id, ...newDoc } as Requirement;
  }

  async updateRequirement(id: string, updates: RequirementUpdate): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, updates as { [x: string]: any });
  }

  async archiveRequirement(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { status: 'archived' });
  }
}
