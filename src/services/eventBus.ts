import { db } from "../lib/firebase";
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

export type EventType = 
  | "CandidateUploaded"
  | "CandidateMatched"
  | "SubmissionCreated"
  | "InterviewScheduled"
  | "JobPublished"
  | "JobClosed"
  | "DealRoomOpened"
  | "PlacementCompleted"
  | "GovernancePolicyApplied"
  | "CandidateEnriched";

export async function emitEvent(
  type: EventType,
  entityType: 'CANDIDATE' | 'JOB' | 'SUBMISSION' | 'DEAL_ROOM' | 'VENDOR' | 'SYSTEM',
  entityId: string,
  actorId: string,
  actorRole: string,
  metadata: Record<string, any> = {}
) {
  try {
    await addDoc(collection(db, "operationalEvents"), {
      type,
      entityType,
      entityId,
      actorId,
      actorRole,
      metadata,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error(`[EventBus] Failed to emit ${type}:`, error);
  }
}

export function subscribeToEvents(callback: (events: any[]) => void, limitCount = 50) {
  const q = query(
    collection(db, "operationalEvents"),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(events);
  }, (error) => {
    console.error("[EventBus] Subscription error:", error);
  });
}
