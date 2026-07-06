import { db } from '../../firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { IEventService, NotificationEvent } from '../contracts/IEventService';

export class FirebaseEventService implements IEventService {
  async publishEvent(event: NotificationEvent): Promise<void> {
    try {
      const promises = event.recipients.map((recipientId) =>
        addDoc(collection(db, "notifications"), {
          title: event.title,
          message: event.message,
          type: event.type,
          actionUrl: event.actionUrl || "",
          recipientId: recipientId,
          read: false,
          createdAt: serverTimestamp(),
        }),
      );

      // Push the global event ledger
      const ledgerPromise = addDoc(collection(db, "event_ledger"), {
        title: event.title,
        message: event.message,
        type: event.type,
        recipients: event.recipients,
        createdAt: serverTimestamp(),
      });
      promises.push(ledgerPromise);

      await Promise.all(promises);
      console.log(`[EVENT ENGINE] Published event: ${event.title}`);
    } catch (err) {
      console.warn("Error publishing event:", err);
    }
  }

  async emitEvent(
    type: string,
    entityType: 'CANDIDATE' | 'JOB' | 'SUBMISSION' | 'DEAL_ROOM' | 'VENDOR' | 'SYSTEM',
    entityId: string,
    actorId: string,
    actorRole: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
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

      // Unified Activity Timeline: Automatically write to the activities collection
      await addDoc(collection(db, "activities"), {
        entityType,
        entityId,
        event: type,
        actor: {
          id: actorId,
          role: actorRole,
          name: metadata?.actorName || actorId
        },
        timestamp: serverTimestamp(),
        metadata: {
          ...metadata,
          tenantId: metadata?.tenantId || metadata?.orgId || "default-tenant"
        }
      });
    } catch (error: any) {
      if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
        console.warn(`[EventBus] emit deferred (Pending Firebase Rules Update)`);
      } else {
        console.error(`[EventBus] Failed to emit ${type}:`, error);
      }
    }
  }

  subscribeToEvents(
    callback: (events: any[]) => void, 
    limitCount = 50,
    orgId?: string,
    role?: string
  ): () => void {
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
        console.warn(`[EventBus] subscribe deferred (Pending Firebase Rules Update)`);
        callback([]);
      } else {
        console.error(`[EventBus] Subscription error:`, error);
        callback([]);
      }
    });
  }
}
