import { db } from './src/lib/firebase-admin.js';

async function test() {
  const q = db.collection("mail_messages");
  const rawSnapshot = await q.get();
  console.log("Found:", rawSnapshot.size);
}

test().catch(console.error);
