export interface Requirement {
  id: string; // The canonical ID
  clientId: string;
  title: string;
  skills: string[];
  budget: string;
  priority: string;
  status: string;
  submissions: string[]; // List of submission IDs

  // JD Intelligence
  mandatorySkills?: string[];
  preferredSkills?: string[];
  optionalSkills?: string[];
  domain?: string;
  location?: string;
  experienceRange?: string; 
  minExperience?: number;
  maxExperience?: number;
  noticePeriod?: string;
  riskRating?: number;
  demandIntensity?: number;
  competitionLevel?: number;
  expectedFillTimeDays?: number;
  jdText?: string;

  // Provenance Fields
  createdFrom?: 'CLIENT' | 'VENDOR' | 'RECRUITER' | 'SYSTEM';
  createdVia?: 'CRM' | 'OS' | 'PORTAL' | 'API' | 'IMPORT';
  createdByRole?: 'CLIENT' | 'VENDOR' | 'BDM' | 'RECRUITER' | 'ADMIN';

  // Lifecycle & Assigned Owners
  assignedBDM?: string;
  assignedRecruiter?: string;

  // Real-time Pipeline Performance Metrics
  submittedCandidates?: number;
  interviewCount?: number;
  offerCount?: number;
  placementCount?: number;
}

export type RequirementInput = Omit<Requirement, 'id'>;
export type RequirementUpdate = Partial<RequirementInput>;

