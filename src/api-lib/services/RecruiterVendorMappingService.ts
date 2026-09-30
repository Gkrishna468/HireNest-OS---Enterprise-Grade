import { adminDb } from "../../lib/firebase-admin.js";

export interface RecruiterVendorMappingDoc {
  id: string;
  recruiterId: string;
  recruiterName: string;
  recruiterEmail?: string;
  vendorId: string;
  vendorName: string;
  assignedBy?: string;
  assignedAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  isPrimary?: boolean;
}

export class RecruiterVendorMappingBackendService {
  // Strictly empty unless explicitly configured by Admin in Firestore
  private static MOCK_INITIAL: RecruiterVendorMappingDoc[] = [];

  public static async getAllMappings(): Promise<RecruiterVendorMappingDoc[]> {
    try {
      if (adminDb) {
        const snap = await adminDb.collection("recruiter_vendor_mappings").get();
        if (!snap.empty) {
          return snap.docs.map(d => ({ id: d.id, ...d.data() } as RecruiterVendorMappingDoc));
        }
      }
    } catch (err) {
      console.warn("[Backend MappingService] Error fetching mappings from Firestore:", err);
    }
    return this.MOCK_INITIAL;
  }

  public static async getMappedVendorsForRecruiter(recruiterId: string): Promise<string[]> {
    if (!recruiterId) return [];
    const all = await this.getAllMappings();
    const mapped = all.filter(m => m.recruiterId === recruiterId && m.status === 'ACTIVE');
    return mapped.map(m => m.vendorId);
  }

  public static async getMappedRecruitersForVendor(vendorId: string): Promise<RecruiterVendorMappingDoc[]> {
    if (!vendorId) return [];
    const all = await this.getAllMappings();
    return all.filter(m => m.vendorId === vendorId && m.status === 'ACTIVE');
  }

  public static async assignMapping(mapping: Partial<RecruiterVendorMappingDoc>): Promise<RecruiterVendorMappingDoc> {
    if (!mapping.recruiterId || !mapping.vendorId) {
      throw new Error("Missing required mapping fields: recruiterId and vendorId");
    }
    const id = `map-${mapping.recruiterId}-${mapping.vendorId}`;
    const fullDoc: RecruiterVendorMappingDoc = {
      id,
      recruiterId: mapping.recruiterId,
      recruiterName: mapping.recruiterName || "Assigned Recruiter",
      recruiterEmail: mapping.recruiterEmail,
      vendorId: mapping.vendorId,
      vendorName: mapping.vendorName || "Partner Vendor",
      assignedBy: mapping.assignedBy || "Admin",
      assignedAt: new Date().toISOString(),
      status: "ACTIVE",
      isPrimary: mapping.isPrimary ?? false
    };

    try {
      if (adminDb) {
        await adminDb.collection("recruiter_vendor_mappings").doc(id).set(fullDoc, { merge: true });
      }
    } catch (err) {
      console.warn("[Backend MappingService] Failed writing to Firestore:", err);
    }

    const idx = this.MOCK_INITIAL.findIndex(m => m.id === id);
    if (idx >= 0) this.MOCK_INITIAL[idx] = fullDoc;
    else this.MOCK_INITIAL.push(fullDoc);

    return fullDoc;
  }

  public static async removeMapping(recruiterId: string, vendorId: string): Promise<void> {
    this.MOCK_INITIAL = this.MOCK_INITIAL.filter(
      m => !(m.recruiterId === recruiterId && m.vendorId === vendorId)
    );

    try {
      if (adminDb) {
        const snap = await adminDb.collection("recruiter_vendor_mappings")
          .where("recruiterId", "==", recruiterId)
          .where("vendorId", "==", vendorId)
          .get();
        snap.forEach(async (d) => {
          await d.ref.delete();
        });
      }
    } catch (err) {
      console.warn("[Backend MappingService] Failed removing from Firestore:", err);
    }
  }
}
