import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export async function generateIdentityHash(email: string, phone: string): Promise<string | null> {
  const normEmail = email?.trim().toLowerCase() || "";
  const normPhone = phone?.replace(/\D/g, "") || "";
  
  if (!normEmail && !normPhone) return null;
  
  const input = `${normEmail}|${normPhone}`;
  const utf8 = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export type OwnershipStatus = 'ACTIVE' | 'EXPIRED' | 'OVERRIDDEN' | 'DISPUTED';

export interface OwnershipClaim {
  id?: string;
  claimId: string;
  candidateHash: string;
  vendorId: string;
  vendorName?: string;
  status: OwnershipStatus;
  claimedAt: any;
  expiresAt: any;
}

export async function calculateIdentityConfidence(email: string, phone: string): Promise<{ level: 'HIGH' | 'MEDIUM' | 'LOW', score: number, type: string }> {
  const hasEmail = Boolean(email?.trim());
  const hasPhone = Boolean(phone?.trim() && phone !== "No Phone Provided");

  if (hasEmail && hasPhone) return { level: 'HIGH', score: 100, type: 'Email + Phone' };
  if (hasEmail) return { level: 'HIGH', score: 90, type: 'Email Only' };
  if (hasPhone) return { level: 'MEDIUM', score: 85, type: 'Phone Only' };
  return { level: 'LOW', score: 50, type: 'Name + Skills' };
}

export async function checkAndClaimOwnership(
  candidateHash: string, 
  vendorId: string, 
  candidateName: string,
  evidence: string = "Resume Upload",
  email: string = "",
  phone: string = ""
): Promise<{ success: boolean; disputeId?: string; claimId?: string }> {
  const claimsRef = collection(db, "ownership_claims");
  const q = query(claimsRef, where("candidateHash", "==", candidateHash));
  const snap = await getDocs(q);

  let activeClaim: OwnershipClaim | null = null;
  
  for (const item of snap.docs) {
    const data = item.data() as OwnershipClaim;
    if (data.status === 'ACTIVE') {
      activeClaim = { ...data, id: item.id };
      break;
    }
  }

  const now = new Date();
  
  if (activeClaim) {
    // Has the claim expired? (Example: 180 days)
    const expiresAt = activeClaim.expiresAt?.toDate ? activeClaim.expiresAt.toDate() : new Date(activeClaim.expiresAt);
    if (expiresAt < now) {
      // Mark existing as EXPIRED
      await updateDoc(doc(db, "ownership_claims", activeClaim.id!), {
        status: 'EXPIRED',
        updatedAt: serverTimestamp()
      });
      // Fall through to create new claim
    } else if (activeClaim.vendorId === vendorId) {
      // Same vendor, refresh the expiry date
      const extendedExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "ownership_claims", activeClaim.id!), {
        expiresAt: extendedExpiresAt,
        updatedAt: serverTimestamp()
      });
      
      await addAuditLog(candidateHash, 'CLAIM_EXTENDED', vendorId);
      return { success: true, claimId: activeClaim.claimId };
    } else {
      // Different vendor submitted a candidate that is actively owned. File dispute.
      const disputeId = `DISP-${Math.random().toString(36).substr(2, 9)}`;
      const confidence = await calculateIdentityConfidence(email, phone);
      await setDoc(doc(db, "ownership_disputes", disputeId), {
        disputeId,
        candidateHash,
        candidateName,
        claimantVendor: vendorId,
        existingVendor: activeClaim.vendorId,
        reason: "Duplicate submission of actively owned candidate",
        evidence,
        confidence: confidence.type,
        requiresAdminReview: confidence.level === 'LOW',
        status: 'OPEN',
        createdAt: serverTimestamp(),
      });
      
      await addAuditLog(candidateHash, 'CLAIM_DISPUTED', vendorId);
      return { success: false, disputeId };
    }
  }

  // Create new active claim
  const claimId = `CLAIM-${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  
  await setDoc(doc(db, "ownership_claims", claimId), {
    claimId,
    candidateHash,
    candidateName,
    vendorId,
    status: 'ACTIVE',
    claimedAt: serverTimestamp(),
    expiresAt: expiresAt,
  });

  const confidence = await calculateIdentityConfidence(email, phone);

  // Create identity record
  await setDoc(doc(db, "candidate_identity", candidateHash), {
    candidateHash,
    candidateName,
    identityConfidence: `${confidence.score}% - ${confidence.type} (${confidence.level})`,
    createdAt: serverTimestamp()
  }, { merge: true });

  await addAuditLog(candidateHash, 'CLAIM_CREATED', vendorId);
  return { success: true, claimId };
}

export async function addAuditLog(candidateHash: string, action: string, performedBy: string) {
  const eventId = `LOG-${Math.random().toString(36).substr(2, 9)}`;
  await setDoc(doc(db, "ownership_audit_log", eventId), {
    eventId,
    candidateHash,
    action,
    performedBy,
    timestamp: serverTimestamp()
  });
}
