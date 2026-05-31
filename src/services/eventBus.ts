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
      eventVersion: 1,
      correlationId: metadata?.correlationId || metadata?.requirementId || metadata?.jobId || entityId,
      timestamp: serverTimestamp()
    });
  } catch (error: any) {
    if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
      console.warn(`[EventBus] emit deferred (Pending Firebase Rules Update)`);
    } else {
      console.error(`[EventBus] Failed to emit ${type}:`, error);
    }
  }
}

export function subscribeToEvents(
  callback: (events: any[]) => void, 
  limitCount = 50,
  orgId?: string,
  role?: string
) {
  let q;

  const isAdminUser = role === "admin" || role === "super_admin" || role === "ops_admin" || role === "hq_admin" || orgId === "ORG-GLOBAL-HQ";
  const isClientUser = role?.includes("client");
  const isVendorUser = role?.includes("vendor") || role?.includes("recruiter") || role?.includes("independent");

  if (isAdminUser || !orgId) {
    q = query(
      collection(db, "operationalEvents"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
  } else if (isClientUser) {
    q = query(
      collection(db, "operationalEvents"),
      where("metadata.clientId", "==", orgId),
      limit(limitCount)
    );
  } else if (isVendorUser) {
    q = query(
      collection(db, "operationalEvents"),
      where("metadata.vendorId", "==", orgId),
      limit(limitCount)
    );
  } else {
    q = query(
      collection(db, "operationalEvents"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    let events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (!isAdminUser && orgId) {
       events.sort((a: any, b: any) => {
          const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return tb - ta;
       });
    }

    callback(events);
  }, (error) => {
    if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
      console.warn("[EventBus] Waiting for Firestore rules deployment to access operationalEvents.");
      // Provide an empty feed gracefully until rules are deployed
      callback([]);
    } else {
      console.error("[EventBus] Subscription error:", error);
    }
  });
}
