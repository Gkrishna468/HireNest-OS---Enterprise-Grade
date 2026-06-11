import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { IVendorService } from '../contracts/IVendorService';
import { Vendor, VendorInput, VendorUpdate } from '../../../types/Vendor';

export class FirebaseVendorService implements IVendorService {
  private collectionName = 'vendors';

  async getVendor(id: string): Promise<Vendor | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Vendor;
    }
    return null;
  }

  async createVendor(data: VendorInput): Promise<Vendor> {
    const docRef = doc(collection(db, this.collectionName));
    const newDoc = { ...data };
    await setDoc(docRef, newDoc);
    return { id: docRef.id, ...newDoc } as Vendor;
  }

  async updateVendor(id: string, updates: VendorUpdate): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, updates as { [x: string]: any });
  }

  async archiveVendor(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { isArchived: true });
  }
}
