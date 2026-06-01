import { adminDb } from '../src/lib/firebase-admin.ts';

async function cleanupDuplicates() {
  console.log("Cleaning up duplicate candidates...");
  const candidateSnap = await adminDb.collection("candidatePool").get();
  
  const emails = new Set();
  const hashes = new Set();
  const toDelete = [];

  for (const doc of candidateSnap.docs) {
    const data = doc.data();
    let isDupe = false;
    
    if (data.email) {
       const emailKey = data.email.toLowerCase();
       if (emails.has(emailKey)) {
         isDupe = true;
       } else {
         emails.add(emailKey);
       }
    }
    
    if (data.documentHash && !isDupe) {
       if (hashes.has(data.documentHash)) {
         isDupe = true;
       } else {
         hashes.add(data.documentHash);
       }
    }

    if (isDupe) {
       toDelete.push(doc.id);
    }
  }

  for (const id of toDelete) {
    console.log("Deleting duplicate candidate:", id);
    await adminDb.collection("candidatePool").doc(id).delete();
  }
  console.log("Cleanup complete.");
}

cleanupDuplicates().catch(console.error);
