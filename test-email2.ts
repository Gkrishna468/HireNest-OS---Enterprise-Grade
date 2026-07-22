import { db } from './src/lib/firebase-admin.js';

async function test() {
  const q = db.collection("mail_messages").where("workspaceId", "==", "ORG-GLOBAL-HQ");
  const rawSnapshot = await q.get();
  console.log("Found in ORG-GLOBAL-HQ:", rawSnapshot.size);
  const data = rawSnapshot.docs[0].data();
  console.log("Date type:", typeof data.createdAt, data.createdAt.toDate ? "isTimestamp" : "notTimestamp");
}

test().catch(console.error);
