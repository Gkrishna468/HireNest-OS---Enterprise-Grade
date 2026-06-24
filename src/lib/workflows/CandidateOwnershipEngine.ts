import { db } from "../firebase";
import { collection, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp, addDoc } from "firebase/firestore";

export interface OwnershipRecord {
  candidateId: string;
  ownerType: 'VENDOR' | 'CLIENT' | 'ADMIN';
  ownerId: string;
  ownedFrom: string;
  lockUntil: string;
}

export class CandidateOwnershipEngine {
  /**
   * Registers ownership of a candidate to a specific vendor/org for a set duration.
   * Typical lock period for agency submissions is 90 days or 180 days.
   */
  static async establishOwnership(
    candidateId: string,
    ownerId: string,
    ownerType: 'VENDOR' | 'CLIENT' | 'ADMIN' = 'VENDOR',
    lockDays: number = 90
  ) {
    try {
      const now = new Date();
      const lockUntil = new Date(now);
      lockUntil.setDate(now.getDate() + lockDays);

      const record = {
        candidateId,
        ownerType,
        ownerId,
        ownedFrom: now.toISOString(),
        lockUntil: lockUntil.toISOString(),
        timestamp: serverTimestamp()
      };

      // Fetch vendorName if applicable
      let vendorName = ownerId === "HQ" || ownerId === "ORG-GLOBAL-HQ" ? "HQ" : ownerId;
      try {
        if (ownerId && ownerId !== "HQ" && ownerId !== "ORG-GLOBAL-HQ") {
           const { getDoc, doc } = await import("firebase/firestore");
           const vendorSnap = await getDoc(doc(db, "organizations", ownerId));
           if (vendorSnap.exists()) {
             vendorName = vendorSnap.data().name || ownerId;
           }
        }
      } catch (e) {
        console.error("Failed to fetch owner name", e);
      }

      // Add to candidateOwnership collection
      await setDoc(doc(db, "candidateOwnership", `${candidateId}_${ownerId}`), record);
      
      // Also write an operational event
      await addDoc(collection(db, "operationalEvents"), {
        entityId: candidateId,
        type: "Ownership Established",
        actorRole: ownerType,
        metadata: {
          ownerId,
          vendorName,
          lockUntil: record.lockUntil
        },
        timestamp: serverTimestamp()
      });

      return { success: true, record };
    } catch (error) {
      console.error("Failed to establish candidate ownership:", error);
      throw error;
    }
  }

  /**
   * Checks if a candidate is currently locked by any OTHER vendor
   */
  static async verifyOwnershipAndCheckConflicts(
    candidateId: string,
    requestingOrgId: string
  ): Promise<{ canProceed: boolean; lockedBy?: string; lockUntil?: string }> {
    try {
      const q = query(
        collection(db, "candidateOwnership"), 
        where("candidateId", "==", candidateId)
      );
      
      const snap = await getDocs(q);
      const now = new Date();
      
      let lockedByOther = null;
      
      for (const d of snap.docs) {
        const data = d.data();
        if (data.ownerId !== requestingOrgId) {
          const lockEnd = new Date(data.lockUntil);
          if (lockEnd > now) {
            lockedByOther = data;
            break;
          }
        }
      }
      
      if (lockedByOther) {
        return {
          canProceed: false,
          lockedBy: lockedByOther.ownerId,
          lockUntil: lockedByOther.lockUntil
        };
      }
      
      return { canProceed: true };
    } catch (e) {
      console.error("Failed to verify candidate ownership:", e);
      return { canProceed: true }; // Fail open for safety if there's no data
    }
  }
}
