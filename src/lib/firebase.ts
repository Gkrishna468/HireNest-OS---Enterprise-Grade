import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
console.log("Firebase initialized successfully");
export const db = getFirestore(app);
console.log("Firestore initialized successfully");
const auth = getAuth(app);
console.log("Auth initialized successfully");
export { auth };
export const storage = getStorage(app);
console.log("Storage initialized successfully");
