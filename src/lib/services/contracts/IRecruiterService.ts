import { Recruiter, RecruiterInput, RecruiterUpdate } from '../../../types/Recruiter';

export interface IRecruiterService {
  getRecruiter(id: string): Promise<Recruiter | null>;
  createRecruiter(data: RecruiterInput): Promise<Recruiter>;
  updateRecruiter(id: string, updates: RecruiterUpdate): Promise<void>;
  archiveRecruiter(id: string): Promise<void>;
}
