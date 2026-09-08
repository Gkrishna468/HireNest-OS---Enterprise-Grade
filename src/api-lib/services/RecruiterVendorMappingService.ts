import { adminDb } from "../../lib/firebase-admin";

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
  private static MOCK_INITIAL: RecruiterVendorMappingDoc[] = [
    {
      id: "map-rahul-abc",
      recruiterId: "recruiter-rahul",
      recruiterName: "Rahul Sharma",
      recruiterEmail: "rahul.sharma@hirenest.ai",
      vendorId: "vendor-abc",
      vendorName: "ABC Technologies",
      assignedBy: "HQ Admin",
      assignedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
      isPrimary: true
    },
    {
      id: "map-rahul-xyz",
      recruiterId: "recruiter-rahul",
      recruiterName: "Rahul Sharma",
      recruiterEmail: "rahul.sharma@hirenest.ai",
      vendorId: "vendor-xyz",
      vendorName: "XYZ Solutions",
      assignedBy: "HQ Admin",
      assignedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
      isPrimary: false
    },
    {
      id: "map-rahul-techsource",
      recruiterId: "recruiter-rahul",
      recruiterName: "Rahul Sharma",
      recruiterEmail: "rahul.sharma@hirenest.ai",
      vendorId: "vendor-techsource",
      vendorName: "TechSource India",
      assignedBy: "HQ Admin",
      assignedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
      isPrimary: false
    },
    {
      id: "map-rahul-cloudstaff",
      recruiterId: "recruiter-rahul",
      recruiterName: "Rahul Sharma",
      recruiterEmail: "rahul.sharma@hirenest.ai",
      vendorId: "vendor-cloudstaff",
      vendorName: "CloudStaff Solutions",
      assignedBy: "HQ Admin",
      assignedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
      isPrimary: false
    },
    {
      id: "map-priya-xyz",
      recruiterId: "recruiter-priya",
      recruiterName: "Priya Kumar",
      recruiterEmail: "priya.kumar@hirenest.ai",
      vendorId: "vendor-xyz",
      vendorName: "XYZ Solutions",
      assignedBy: "HQ Admin",
      assignedAt: new Date(Date.now() - 22 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
      isPrimary: true
    },
    {
      id: "map-priya-nexus",
      recruiterId: "recruiter-priya",
      recruiterName: "Priya Kumar",
      recruiterEmail: "priya.kumar@hirenest.ai",
      vendorId: "vendor-nexus",
      vendorName: "Nexus Talent Partners",
      assignedBy: "HQ Admin",
      assignedAt: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
      isPrimary: false
    },
    {
      id: "map-amit-apex",
      recruiterId: "recruiter-amit",
      recruiterName: "Amit Singh",
      recruiterEmail: "amit.singh@hirenest.ai",
      vendorId: "vendor-apex",
      vendorName: "Apex Staffing",
      assignedBy: "HQ Admin",
      assignedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
      isPrimary: true
    }
  ];

  public static async getAllMappings(): Promise<RecruiterVendorMappingDoc[]> {
    try {
      if (adminDb) {
        const snap = await adminDb.collection("recruiter_vendor_mappings").get();
        if (!snap.empty) {
          return snap.docs.map(d => ({ id: d.id, ...d.data() } as RecruiterVendorMappingDoc));
        }
      }
    } catch (err) {
      console.warn("[Backend MappingService] Error fetching mappings from Firestore, falling back:", err);
    }
    return this.MOCK_INITIAL;
  }

  public static async getMappedVendorsForRecruiter(recruiterId: string): Promise<string[]> {
    const all = await this.getAllMappings();
    const mapped = all.filter(m => m.recruiterId === recruiterId && m.status === 'ACTIVE');
    return mapped.map(m => m.vendorId);
  }

  public static async getMappedRecruitersForVendor(vendorId: string): Promise<RecruiterVendorMappingDoc[]> {
    const all = await this.getAllMappings();
    return all.filter(m => (m.vendorId === vendorId || vendorId.includes(m.vendorId)) && m.status === 'ACTIVE');
  }

  public static async assignMapping(mapping: Partial<RecruiterVendorMappingDoc>): Promise<RecruiterVendorMappingDoc> {
    const id = `map-${mapping.recruiterId}-${mapping.vendorId}`;
    const fullDoc: RecruiterVendorMappingDoc = {
      id,
      recruiterId: mapping.recruiterId || "recruiter-rahul",
      recruiterName: mapping.recruiterName || "Rahul Sharma",
      recruiterEmail: mapping.recruiterEmail,
      vendorId: mapping.vendorId || "vendor-abc",
      vendorName: mapping.vendorName || "ABC Technologies",
      assignedBy: mapping.assignedBy || "HQ Admin",
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
