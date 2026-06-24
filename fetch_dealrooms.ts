import { adminDb } from "./src/api-lib/firebase-admin";

async function run() {
  const snapshot = await adminDb.collection('dealRooms').get();
  console.log(`Found ${snapshot.size} deal rooms`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

run().catch(console.error);
