import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Load secret from environment or google app credentials
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
} catch (e) {
  const accountPath = "firebase-applet-config.json";
  if (fs.existsSync(accountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(accountPath, "utf8"));
  }
}

if (!serviceAccount || !serviceAccount.project_id) {
  console.error("No FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function cleanMockData() {
  const candidatesRef = db.collection('candidatePool');
  const snap = await candidatesRef.get();
  let deleted = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (
      data.name === "Local Mock Generated" ||
      data.email === "mock@example.com" ||
      data.email === "pending@hirenest.os" ||
      data.name === "Pending Distillation" ||
      data.name === "Parsing Pending" ||
      data.name === "Sarah Jenkins" ||
      data.name === "Unnamed Candidate" ||
      data.name === "Unknown Candidate"
    ) {
      await doc.ref.delete();
      console.log("Deleted mock candidate:", doc.id, data.name, data.email);
      deleted++;
    }
  }
  console.log("Cleanup completed. Deleted: ", deleted);
  process.exit(0);
}

cleanMockData().catch(console.error);
