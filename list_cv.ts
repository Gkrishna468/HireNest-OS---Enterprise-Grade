import { db } from "./src/lib/firebase-admin.js";

async function listCV() {
  const c = await db.collection("clients").get();
  console.log("CLIENTS");
  c.docs.forEach(d => console.log(d.id, d.data().name, d.data().companyName));

  const v = await db.collection("vendors").get();
  console.log("VENDORS");
  v.docs.forEach(d => console.log(d.id, d.data().name, d.data().companyName));
  
  process.exit(0);
}

listCV();
