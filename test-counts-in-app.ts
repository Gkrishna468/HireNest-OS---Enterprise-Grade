import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault(),
  projectId: 'hirenest-os'
});

const db = getFirestore();

async function run() {
  try {
    const c = await db.collection('candidate_matches').count().get();
    const m = await db.collection('match_opportunities').count().get();
    const r = await db.collection('requirement_match_index').count().get();
    
    console.log('candidate_matches:', c.data().count);
    console.log('match_opportunities:', m.data().count);
    console.log('requirement_match_index:', r.data().count);
  } catch (e) {
    console.error(e.message);
  }
}
run();
