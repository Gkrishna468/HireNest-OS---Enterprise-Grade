import { Candidate, CandidateInput, CandidateUpdate } from '../../../types/Candidate';

export interface ICandidateService {
  getCandidate(id: string): Promise<Candidate | null>;
  createCandidate(data: CandidateInput): Promise<Candidate>;
  updateCandidate(id: string, updates: CandidateUpdate): Promise<void>;
  archiveCandidate(id: string): Promise<void>;
}
