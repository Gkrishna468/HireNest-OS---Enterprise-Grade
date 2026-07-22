import { db } from './src/lib/firebase-admin.js';

async function test() {
  const users = await db.collection("users").where("email", "==", "gopalkrishna0046@gmail.com").get();
  if (users.empty) {
    console.log("User not found");
  } else {
    users.docs.forEach(d => console.log(d.id, d.data().orgId, d.data().organizationId));
  }
}

test().catch(console.error);
