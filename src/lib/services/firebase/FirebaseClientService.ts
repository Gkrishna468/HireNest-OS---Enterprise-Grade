import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { IClientService } from '../contracts/IClientService';
import { Client, ClientInput, ClientUpdate } from '../../../types/Client';

export class FirebaseClientService implements IClientService {
  private collectionName = 'clients';

  async getClient(id: string): Promise<Client | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Client;
    }
    return null;
  }

  async createClient(data: ClientInput): Promise<Client> {
    const docRef = doc(collection(db, this.collectionName));
    const newDoc = { ...data };
    await setDoc(docRef, newDoc);
    return { id: docRef.id, ...newDoc } as Client;
  }

  async updateClient(id: string, updates: ClientUpdate): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, updates as { [x: string]: any });
  }

  async archiveClient(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { isArchived: true });
  }
}
