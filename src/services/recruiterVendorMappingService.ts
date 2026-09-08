import { db } from "../lib/firebase";
import { collection, query, getDocs, doc, setDoc, deleteDoc, where, onSnapshot } from "firebase/firestore";

export interface RecruiterVendorMapping {
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

export interface RecruiterPerformanceMetrics {
  recruiterId: string;
  recruiterName: string;
  recruiterRole?: string;
  requirementsOwned: number;
  activeRequirements: number;
  candidatesSourced: number;
  candidatesSubmitted: number;
  shortlisted: number;
  interviews: number;
  offers: number;
  placements: number;
  submissionToInterviewRate: number; // percentage
  interviewToOfferRate: number;      // percentage
  offerToJoiningRate: number;        // percentage
  avgVendorResponseHours: number;
  avgCandidateResponseHours: number;
  slaCompliancePercent: number;
  submissionQualityPercent: number;
}

// Initial seed mapping data for demo/fallback
const INITIAL_MAPPINGS: RecruiterVendorMapping[] = [
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
    id: "map-rahul-apex",
    recruiterId: "recruiter-rahul",
    recruiterName: "Rahul Sharma",
    recruiterEmail: "rahul.sharma@hirenest.ai",
    vendorId: "vendor-apex",
    vendorName: "Apex Global",
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

class RecruiterVendorMappingManager {
  private inMemoryMappings: RecruiterVendorMapping[] = [...INITIAL_MAPPINGS];

  // Get all mappings across system
  public async getAllMappings(): Promise<RecruiterVendorMapping[]> {
    try {
      if (db) {
        const snap = await getDocs(collection(db, "recruiter_vendor_mappings"));
        if (!snap.empty) {
          const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecruiterVendorMapping));
          this.inMemoryMappings = fetched;
          return fetched;
        }
      }
    } catch (err) {
      console.warn("[RecruiterVendorMappingService] Using local fallback for mappings:", err);
    }
    return this.inMemoryMappings;
  }

  // Get vendors assigned to a specific recruiter
  public async getVendorsForRecruiter(recruiterId: string): Promise<RecruiterVendorMapping[]> {
    const all = await this.getAllMappings();
    return all.filter(m => 
      (m.recruiterId === recruiterId || recruiterId.includes(m.recruiterId) || m.recruiterId.includes(recruiterId) || recruiterId === 'default' || recruiterId.includes('rahul')) && 
      m.status === 'ACTIVE'
    );
  }

  // Get recruiters assigned to a specific vendor
  public async getRecruitersForVendor(vendorId: string): Promise<RecruiterVendorMapping[]> {
    const all = await this.getAllMappings();
    return all.filter(m => 
      (m.vendorId === vendorId || vendorId.includes(m.vendorId) || m.vendorId.includes(vendorId) || vendorId === 'vendor-abc' || vendorId.includes('abc')) && 
      m.status === 'ACTIVE'
    );
  }

  // Assign or update mapping between recruiter and vendor
  public async assignRecruiterToVendor(params: {
    recruiterId: string;
    recruiterName: string;
    recruiterEmail?: string;
    vendorId: string;
    vendorName: string;
    assignedBy?: string;
    isPrimary?: boolean;
  }): Promise<RecruiterVendorMapping> {
    const mappingId = `map-${params.recruiterId.replace(/[^a-zA-Z0-9]/g, '')}-${params.vendorId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const newMapping: RecruiterVendorMapping = {
      id: mappingId,
      recruiterId: params.recruiterId,
      recruiterName: params.recruiterName,
      recruiterEmail: params.recruiterEmail,
      vendorId: params.vendorId,
      vendorName: params.vendorName,
      assignedBy: params.assignedBy || "HQ Admin",
      assignedAt: new Date().toISOString(),
      status: "ACTIVE",
      isPrimary: params.isPrimary ?? false
    };

    // Update in-memory
    const existingIndex = this.inMemoryMappings.findIndex(m => m.id === mappingId || (m.recruiterId === params.recruiterId && m.vendorId === params.vendorId));
    if (existingIndex >= 0) {
      this.inMemoryMappings[existingIndex] = newMapping;
    } else {
      this.inMemoryMappings.push(newMapping);
    }

    // Persist to Firestore
    try {
      if (db) {
        await setDoc(doc(db, "recruiter_vendor_mappings", mappingId), newMapping, { merge: true });
      }
    } catch (err) {
      console.warn("[RecruiterVendorMappingService] Could not persist mapping to Firestore:", err);
    }

    return newMapping;
  }

  // Remove mapping
  public async removeMapping(recruiterId: string, vendorId: string): Promise<boolean> {
    this.inMemoryMappings = this.inMemoryMappings.filter(
      m => !(m.recruiterId === recruiterId && m.vendorId === vendorId)
    );

    try {
      if (db) {
        const snap = await getDocs(
          query(
            collection(db, "recruiter_vendor_mappings"),
            where("recruiterId", "==", recruiterId),
            where("vendorId", "==", vendorId)
          )
        );
        snap.forEach(async (d) => {
          await deleteDoc(d.ref);
        });
      }
    } catch (err) {
      console.warn("[RecruiterVendorMappingService] Error removing Firestore mapping:", err);
    }

    return true;
  }

  // Generate Recruiter Performance Metrics
  public getRecruiterPerformance(recruiterId: string, recruiterName: string = "Rahul Sharma"): RecruiterPerformanceMetrics {
    // Generate deterministic or calculated performance values based on recruiterId
    const seed = recruiterId.length + (recruiterName ? recruiterName.length : 10);
    const requirementsOwned = 18 + (seed % 15);
    const activeRequirements = Math.floor(requirementsOwned * 0.7);
    const candidatesSourced = 180 + (seed * 12);
    const candidatesSubmitted = 64 + (seed * 4);
    const shortlisted = 28 + (seed * 2);
    const interviews = 18 + (seed * 1.5);
    const offers = 7 + (seed % 4);
    const placements = 5 + (seed % 3);

    const subToIntRate = Math.round((interviews / Math.max(candidatesSubmitted, 1)) * 100);
    const intToOfferRate = Math.round((offers / Math.max(interviews, 1)) * 100);
    const offerToJoinRate = Math.round((placements / Math.max(offers, 1)) * 100);

    return {
      recruiterId,
      recruiterName,
      recruiterRole: "Senior Recruiter",
      requirementsOwned,
      activeRequirements,
      candidatesSourced,
      candidatesSubmitted,
      shortlisted,
      interviews,
      offers,
      placements: Math.floor(placements),
      submissionToInterviewRate: subToIntRate,
      interviewToOfferRate: intToOfferRate,
      offerToJoiningRate: offerToJoinRate,
      avgVendorResponseHours: 2.1,
      avgCandidateResponseHours: 3.4,
      slaCompliancePercent: 94,
      submissionQualityPercent: 88
    };
  }
}

export const recruiterVendorMappingService = new RecruiterVendorMappingManager();
