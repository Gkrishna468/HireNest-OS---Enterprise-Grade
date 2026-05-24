import { db } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy 
} from "firebase/firestore";

/**
 * HireNestOS Auto Job Broadcast Engine
 * Optimized for Enterprise Vendor Segmentation.
 */

export interface BroadcastJD {
  id: string;
  skills: string[];
  domain: string;
  employmentType: string;
  compensationModel: string;
  workMode: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class BroadcastEngine {
  /**
   * Broadcasts a JD to relevant vendors based on trust and specialization.
   */
  static async broadcast(jd: BroadcastJD) {
    console.log(`[BROADCAST] Initializing engine for JD: ${jd.id}`);

    // 1. Fetch High-Trust Vendors
    const vendorRef = collection(db, "organizations");
    const q = query(
      vendorRef, 
      where("type", "==", "vendor"), 
      where("status", "==", "active"),
      orderBy("trustScore", "desc"),
      limit(50)
    );

    const snap = await getDocs(q);
    const vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    // 2. Segment Vendors by Specialization & Performance
    const targetVendors = vendors.filter(v => {
      // Logic: Does the vendor specialize in one of the JD's core skills or domain?
      const specializationMatch = jd.skills.some(skill => 
        v.specializations?.includes(skill)
      );
      
      const domainMatch = v.domains?.includes(jd.domain);
      
      // Trust Floor: Don't broadcast to low trust vendors unless JD is critical
      const trustFloor = jd.urgency === 'CRITICAL' ? 40 : 70;
      const trustPass = (v.trustScore || 0) >= trustFloor;

      return (specializationMatch || domainMatch) && trustPass;
    });

    // 3. Limit Broadcast for Quality Control
    // Broadast to top 15 relevant vendors max
    const finalVendors = targetVendors.slice(0, 15);

    // 4. Execute Broadcast (Log events for each vendor)
    const notifications = finalVendors.map(vendor => 
      addDoc(collection(db, "notifications"), {
        recipientId: vendor.id, // Assuming doc ID is the target
        type: "JOB_BROADCAST",
        title: "New Optimized Requirement Node",
        message: `Requirement ${jd.id} matches your specialization profile.`,
        priority: jd.urgency,
        metadata: {
          requirementId: jd.id,
          matchConfidence: "OPTIMIZED_SEGMENTATION"
        },
        read: false,
        createdAt: new Date().toISOString()
      })
    );

    // 5. Log Global Broadcast Event
    await addDoc(collection(db, "execution_events"), {
      eventType: "BROADCAST_EXECUTED",
      targetId: jd.id,
      targetType: "requirement",
      actorId: "broadcast-engine-v1",
      actorType: "system",
      timestamp: Date.now(),
      metadata: {
        vendorCount: finalVendors.length,
        urgency: jd.urgency
      }
    });

    await Promise.all(notifications);

    return {
      broadcastCount: finalVendors.length,
      vendors: finalVendors.map(v => v.id)
    };
  }
}
