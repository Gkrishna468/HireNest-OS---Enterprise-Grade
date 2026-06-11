export interface Vendor {
  id: string; // The canonical ID
  agencyName: string;
  contactPerson: string;
  associatedRecruiters: string[]; // List of recruiter IDs
  performanceScore: number;
  accessSettings: string;
}

export type VendorInput = Omit<Vendor, 'id'>;
export type VendorUpdate = Partial<VendorInput>;
