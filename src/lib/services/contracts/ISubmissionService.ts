import { Submission, SubmissionInput, SubmissionUpdate } from '../../../types/Submission';

export interface ISubmissionService {
  getSubmission(id: string): Promise<Submission | null>;
  createSubmission(data: SubmissionInput): Promise<Submission>;
  updateSubmission(id: string, updates: Partial<Record<string, any>>): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
  updateInterviewEvent(id: string, event: Record<string, any>): Promise<void>;
  updateOfferStatus(id: string, offerStatus: string): Promise<void>;
  updateJoiningStatus(id: string, joiningStatus: string): Promise<void>;
}
