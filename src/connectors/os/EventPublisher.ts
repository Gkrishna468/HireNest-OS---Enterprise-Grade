import { EventEnvelope } from '../../events/types/EventEnvelope';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export class EventPublisher {
  static async publish(event: EventEnvelope<any>) {
    console.log(`[EventPublisher] Publishing event to system_events: ${event.type}`);
    const docRef = doc(db, 'system_events', event.id);
    await setDoc(docRef, {
      ...event,
      status: "PENDING",
      publishedAt: new Date().toISOString()
    });
  }
}
