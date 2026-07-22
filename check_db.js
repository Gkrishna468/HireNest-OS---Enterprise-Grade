import { db } from './src/lib/firebase-admin.js';
async function run() {
  const msgs = await db.collection('mail_messages').get();
  console.log('Total mail_messages:', msgs.size);
  msgs.docs.forEach(d => console.log(d.id, d.data().workspaceId, d.data().status));
}
run().catch(console.error);
