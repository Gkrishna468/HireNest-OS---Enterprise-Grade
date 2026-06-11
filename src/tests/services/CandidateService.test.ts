/// <reference types="jest" />
import { FirebaseCandidateService } from '../../lib/services/firebase/FirebaseCandidateService';
import { ICandidateService } from '../../lib/services/contracts/ICandidateService';

describe('FirebaseCandidateService', () => {
  let service: ICandidateService;

  beforeEach(() => {
    // Mock the db and init service here in a real environment
    service = new FirebaseCandidateService();
  });

  it('should implement ICandidateService', () => {
    expect(service.getCandidate).toBeDefined();
    expect(service.createCandidate).toBeDefined();
    expect(service.updateCandidate).toBeDefined();
    expect(service.archiveCandidate).toBeDefined();
  });
});
