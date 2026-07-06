export interface Candidate {
  id: string; // The canonical ID
  resumeData: string;
  skills: string[];
  experience: string;
  domain: string;
  aiScore: number;
  comments?: any[];
  
  // Immutable Ownership Metadata Fields
  ownerType?: 'VENDOR' | 'RECRUITER' | 'SYSTEM';
  ownerId?: string;
  ownerName?: string;
  acquiredAt?: string;
  acquisitionMethod?: 'UPLOAD' | 'SOURCED' | 'IMPORT' | 'REFERRAL';
  
  // Provenance Fields
  createdFrom?: 'CLIENT' | 'VENDOR' | 'RECRUITER' | 'SYSTEM';
  createdVia?: 'CRM' | 'OS' | 'PORTAL' | 'API' | 'IMPORT';
  createdByRole?: 'CLIENT' | 'VENDOR' | 'BDM' | 'RECRUITER' | 'ADMIN';
}

export type CandidateInput = Omit<Candidate, 'id'>;
export type CandidateUpdate = Partial<CandidateInput>;

