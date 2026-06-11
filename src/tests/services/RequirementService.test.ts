/// <reference types="jest" />
import { FirebaseRequirementService } from '../../lib/services/firebase/FirebaseRequirementService';
import { IRequirementService } from '../../lib/services/contracts/IRequirementService';

describe('FirebaseRequirementService', () => {
  let service: IRequirementService;

  beforeEach(() => {
    service = new FirebaseRequirementService();
  });

  it('should implement IRequirementService', () => {
    expect(service.getRequirement).toBeDefined();
    expect(service.createRequirement).toBeDefined();
    expect(service.updateRequirement).toBeDefined();
    expect(service.archiveRequirement).toBeDefined();
  });
});
