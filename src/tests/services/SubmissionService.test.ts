/// <reference types="jest" />
import { FirebaseSubmissionService } from '../../lib/services/firebase/FirebaseSubmissionService';
import { ISubmissionService } from '../../lib/services/contracts/ISubmissionService';

describe('FirebaseSubmissionService', () => {
  let service: ISubmissionService;

  beforeEach(() => {
    service = new FirebaseSubmissionService();
  });

  it('should implement ISubmissionService', () => {
    expect(service.getSubmission).toBeDefined();
    expect(service.createSubmission).toBeDefined();
    expect(service.updateStatus).toBeDefined();
    expect(service.updateInterviewEvent).toBeDefined();
    expect(service.updateOfferStatus).toBeDefined();
    expect(service.updateJoiningStatus).toBeDefined();
  });
});
