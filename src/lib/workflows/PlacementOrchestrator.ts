import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

export type PlacementStage = 
  | 'OFFER_RELEASED'
  | 'OFFER_ACCEPTED'
  | 'NOTICE_PERIOD'
  | 'JOINING_CONFIRMED'
  | 'JOINED'
  | 'GUARANTEE_PERIOD'
  | 'INVOICE_PENDING'
  | 'INVOICED'
  | 'PAID'
  | 'OFFER_DECLINED'
  | 'DROPPED_OUT';

export interface OfferDetails {
  baseSalary: number;
  currency: string;
  bonus?: number;
  joiningDate: string;
  notes?: string;
  placementFeePercent?: number; // E.g., 20%
}

export interface PlacementRecord {
  submissionId: string;
  candidateId: string;
  candidateName: string;
  requirementId: string;
  clientId: string;
  vendorId: string;
  dealRoomId?: string;
  offerDetails: OfferDetails;
  status: PlacementStage;
  expectedFee?: number;
  invoiceId?: string;
}

export class PlacementOrchestrator {
  
  static async initiateOffer(req: Omit<PlacementRecord, 'status'>) {
    const placementRef = await addDoc(collection(db, "placements"), {
      ...req,
      status: 'OFFER_RELEASED',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // We also update the submission status to reflect offer stage
    await updateDoc(doc(db, "submissions", req.submissionId), {
      status: 'OFFER_RELEASED',
      placementId: placementRef.id,
      updatedAt: serverTimestamp()
    });

    if (req.dealRoomId) {
      await addDoc(collection(db, "dealRooms", req.dealRoomId, "messages"), {
        type: 'event',
        text: `🎉 Offer Released for ${req.candidateName}! Base: ${req.offerDetails.baseSalary} ${req.offerDetails.currency}. Joining: ${req.offerDetails.joiningDate}`,
        senderId: 'system',
        senderRole: 'System',
        timestamp: serverTimestamp()
      });
    }

    return placementRef.id;
  }

  static async acceptOffer(placementId: string, submissionId: string) {
    await updateDoc(doc(db, "placements", placementId), {
      status: 'OFFER_ACCEPTED',
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "submissions", submissionId), {
      status: 'OFFER_ACCEPTED',
      updatedAt: serverTimestamp()
    });
  }

  static async updateStatus(placementId: string, newStatus: PlacementStage) {
    const placementSnap = await getDoc(doc(db, "placements", placementId));
    
    await updateDoc(doc(db, "placements", placementId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    if (placementSnap.exists() && placementSnap.data().submissionId) {
       // Map placement status to SubmissionState enum equivalents where applicable
       let subStatus = newStatus as string;
       if (newStatus === 'INVOICED' || newStatus === 'INVOICE_PENDING') {
           subStatus = 'INVOICE_GENERATED';
       } else if (newStatus === 'PAID') {
           subStatus = 'PAYMENT_RECEIVED';
       } else if (newStatus === 'OFFER_DECLINED' || newStatus === 'DROPPED_OUT') {
           subStatus = 'OFFER_DECLINED';
       }

       await updateDoc(doc(db, "submissions", placementSnap.data().submissionId), {
         status: subStatus,
         updatedAt: serverTimestamp()
       });
    }
  }
}
