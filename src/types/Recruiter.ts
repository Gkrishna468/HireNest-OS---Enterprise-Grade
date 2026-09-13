import { RecruiterSubtype, UserType, RequirementScopeType } from "../lib/rbac";

export interface Recruiter {
  id: string; // The canonical ID (uid)
  name: string;
  email?: string;
  phone?: string;
  userType?: UserType;
  subtype?: RecruiterSubtype;
  organizationId?: string;
  agencyVendorId?: string; // Optional as per Data_Model.md
  vendorId?: string;
  requirementScope?: RequirementScopeType;
  assignedRequirementIds?: string[];
  placements: number;
  submissions: number;
  rolePermissions?: string;
  status?: "ACTIVE" | "INACTIVE";
  createdAt?: string;
}

export type RecruiterInput = Omit<Recruiter, 'id'>;
export type RecruiterUpdate = Partial<RecruiterInput>;

