import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function test() {
  await signInWithEmailAndPassword(auth, 'gopalkrishna0046@gmail.com', '123456');
  console.log("Logged in");
  
  try {
     const snap = await getDocs(query(collection(db, "candidate_matches"), where("clientId", "==", "ORG-TEST")));
     console.log("Success:", snap.docs.length);
  } catch (e) {
     console.error("Error:", e.message);
  }
  process.exit(0);
}
test();
