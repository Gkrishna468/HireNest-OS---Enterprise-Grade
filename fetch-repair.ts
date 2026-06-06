import { adminDb } from "./src/lib/firebase-admin.ts";

async function run() {
  if (!adminDb) {
    console.error("No admin db");
    process.exit(1);
  }
  const qSnap = await adminDb.collection("candidatePool").get();
  let count = 0;
  for (const doc of qSnap.docs) {
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
        console.log("Deleted", data.name, data.email);
        count++;
      }
  }
  console.log("Deleted total count:", count);
  process.exit(0);
}
run();
