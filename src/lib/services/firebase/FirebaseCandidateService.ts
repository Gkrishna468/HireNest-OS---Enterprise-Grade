import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { ICandidateService } from '../contracts/ICandidateService';
import { Candidate, CandidateInput, CandidateUpdate } from '../../../types/Candidate';

export class FirebaseCandidateService implements ICandidateService {
  private collectionName = 'candidatePool';

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
    // Immutability Safety: Protect ownership fields from being modified after creation
    const { ownerType, ownerId, ownerName, acquiredAt, acquisitionMethod, ...safeUpdates } = updates as any;
    await updateDoc(docRef, safeUpdates as { [x: string]: any });
  }

  async archiveCandidate(id: string): Promise<void> {
    const updateData = {
      status: "DELETED",
      isActive: false,
      deletedAt: serverTimestamp(),
      deletedBy: "system", // This should ideally come from parameter
      deletionReason: "Admin Requested Deletion"
    };

    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, updateData);

    const ownershipQ = query(collection(db, "ownershipVault"), where("candidateId", "==", id));
    const ownershipSnap = await getDocs(ownershipQ);
    for (const d of ownershipSnap.docs) {
       await updateDoc(d.ref, { isActive: false, status: "DELETED" });
    }

    const submissionsQ = query(collection(db, "submissions"), where("candidateId", "==", id));
    const submissionsSnap = await getDocs(submissionsQ);
    for (const d of submissionsSnap.docs) {
       await updateDoc(d.ref, { isActive: false, status: "DELETED" });
    }
    
    const dealRoomsQ = query(collection(db, "dealRooms"), where("candidateId", "==", id));
    const dealRoomsSnap = await getDocs(dealRoomsQ);
    for (const d of dealRoomsSnap.docs) {
       await updateDoc(d.ref, { isActive: false, status: "DELETED" });
    }
  }
}
