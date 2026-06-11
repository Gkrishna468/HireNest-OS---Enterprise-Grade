export interface Recruiter {
  id: string; // The canonical ID
  name: string;
  agencyVendorId?: string; // Optional as per Data_Model.md
  placements: number;
  submissions: number;
  rolePermissions: string;
}

export type RecruiterInput = Omit<Recruiter, 'id'>;
export type RecruiterUpdate = Partial<RecruiterInput>;
