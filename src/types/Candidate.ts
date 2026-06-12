export interface Candidate {
  id: string; // The canonical ID
  resumeData: string;
  skills: string[];
  experience: string;
  domain: string;
  aiScore: number;
  comments?: any[];
}

export type CandidateInput = Omit<Candidate, 'id'>;
export type CandidateUpdate = Partial<CandidateInput>;
