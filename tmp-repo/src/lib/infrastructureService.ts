import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";

export enum ExecutionEventType {
  JD_CREATED = "JD_CREATED",
  VENDOR_ASSIGNED = "VENDOR_ASSIGNED",
  SUBMISSION_RECEIVED = "SUBMISSION_RECEIVED",
  INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED",
  SLA_BREACHED = "SLA_BREACHED",
  OFFER_ISSUED = "OFFER_ISSUED",
  PLACEMENT_CLOSED = "PLACEMENT_CLOSED",
  PAYMENT_TRIGGERED = "PAYMENT_TRIGGERED",
  REVENUE_REALIZED = "REVENUE_REALIZED",
  MARGIN_LEAKAGE_DETECTED = "MARGIN_LEAKAGE_DETECTED"
}

export type ActorType = "system" | "admin" | "client" | "vendor" | "recruiter";
export type TargetType = "requirement" | "candidate" | "deal_room" | "user" | "organization";

// --- Execution Event Bus ---
export async function logExecutionEvent(
  type: ExecutionEventType,
  targetId: string,
  targetType: TargetType,
  metadata: any = {},
  requirementId?: string
) {
  // Clean metadata to remove undefined values which Firestore doesn't support
  const cleanMetadata = metadata ? JSON.parse(JSON.stringify(metadata, (key, value) => value === undefined ? null : value)) : {};

  try {
    const event = {
      eventType: type,
      actorId: auth.currentUser?.uid || "system",
      actorType: metadata.actorType || "recruiter", 
      targetId,
      targetType,
      requirementId: requirementId || metadata.requirementId || null,
      metadata: cleanMetadata,
      timestamp: new Date().toISOString()
    };

    await addDoc(collection(db, "execution_events"), event);
    
    // Update Trust Metrics based on event
    await processEventForTrust(type, targetId, metadata);
    
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "execution_events");
    return false;
  }
}

// --- Trust Engine Logic ---
async function processEventForTrust(type: ExecutionEventType, targetId: string, metadata: any) {
  const orgId = metadata.organizationId;
  if (!orgId) return;

  const trustRef = doc(db, "trust_metrics", orgId);
  const trustSnap = await getDoc(trustRef);

  if (!trustSnap.exists()) {
    await setDoc(trustRef, {
      nodeId: orgId,
      nodeType: "organization",
      score: 85, // Starting score
      totalClosures: 0,
      avgResponseTime: 0,
      eventsProcessed: 1,
      lastUpdated: new Date().toISOString()
    });
  }

  // Update logic based on event type
  const updates: any = {
    lastUpdated: new Date().toISOString(),
    eventsProcessed: increment(1)
  };

  if (type === ExecutionEventType.PLACEMENT_CLOSED) {
    updates.totalClosures = increment(1);
    updates.score = increment(2); 
  }

  if (type === ExecutionEventType.SLA_BREACHED) {
    updates.score = increment(-5); 
  }

  if (type === ExecutionEventType.MARGIN_LEAKAGE_DETECTED) {
    updates.score = increment(-10);
  }

  if (type === ExecutionEventType.REVENUE_REALIZED) {
    updates.score = increment(1);
  }

  try {
    await updateDoc(trustRef, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `trust_metrics/${orgId}`);
  }
}

// --- SLA Management ---
export async function createSLA(
  requirementId: string,
  type: "SUBMISSION" | "FEEDBACK" | "INTERVIEW",
  deadlineHours: number = 48
) {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + deadlineHours);

  const sla = {
    requirementId,
    type,
    deadline: deadline.toISOString(),
    status: "OK",
    breachTriggered: false,
    createdAt: new Date().toISOString()
  };

  try {
    await addDoc(collection(db, "slas"), sla);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "slas");
  }
}

export function calculateTrustGrade(score: number): string {
  if (score >= 98) return "AAA+ (Network Sovereign)";
  if (score >= 95) return "AAA (Verified Alpha)";
  if (score >= 85) return "AA (High Trust)";
  if (score >= 70) return "A (Operating)";
  if (score >= 50) return "B (Under Review)";
  return "C (Toxic/De-prioritized)";
}

export async function triggerAutonomousEscalation(slaId: string, reason: string) {
  const slaRef = doc(db, "slas", slaId);
  const slaSnap = await getDoc(slaRef);
  
  if (slaSnap.exists()) {
    const slaData = slaSnap.data();
    
    // Log Escalation event
    await logExecutionEvent(
      ExecutionEventType.SLA_BREACHED,
      slaData.targetId || slaData.requirementId,
      (slaData.targetType as any) || "requirement",
      { 
        reason,
        note: `AUTONOMOUS INTERVENTION: Rerouting execution due to ${reason}.`,
        severity: "CRITICAL"
      },
      slaData.requirementId
    );

    // In a real system, we would trigger an email or push notification here
    console.log(`[ESCALATION] Autonomous intervention for SLA ${slaId}: ${reason}`);
  }
}
