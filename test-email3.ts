import { db } from './src/lib/firebase-admin.js';

async function test() {
  const q = db.collection("mail_messages").where("workspaceId", "==", "ORG-GLOBAL-HQ");
  const rawSnapshot = await q.get();
  console.log("Found:", rawSnapshot.size);
  if (rawSnapshot.size > 0) {
     console.log(JSON.stringify(rawSnapshot.docs[0].data(), null, 2));
  }
}

test().catch(console.error);
