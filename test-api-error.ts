import { db } from './src/lib/firebase-admin.js';

async function test() {
  let query = db.collection("mail_messages").where("workspaceId", "==", "ORG-GLOBAL-HQ");
  let docs = [];
  try {
    const snapshot = await query.orderBy("createdAt", "desc").limit(25).get();
    docs = snapshot.docs;
    console.log("Found with index:", docs.length);
  } catch (err) {
    console.log("Index error:", err.message);
    const rawSnapshot = await query.get();
    const sortedDocs = rawSnapshot.docs.sort((a, b) => {
          const dataA = a.data();
          const dataB = b.data();
          const timeA = dataA.createdAt
            ? dataA.createdAt.toDate
              ? dataA.createdAt.toDate().getTime()
              : new Date(dataA.createdAt).getTime()
            : 0;
          const timeB = dataB.createdAt
            ? dataB.createdAt.toDate
              ? dataB.createdAt.toDate().getTime()
              : new Date(dataB.createdAt).getTime()
            : 0;
          return timeB - timeA; // Descending
    });
    docs = sortedDocs.slice(0, 25);
    console.log("Found without index:", docs.length);
  }
}
test().catch(console.error);
