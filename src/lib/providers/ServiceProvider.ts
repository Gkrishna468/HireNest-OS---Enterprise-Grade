import { ICandidateService } from '../services/contracts/ICandidateService';
import { IRequirementService } from '../services/contracts/IRequirementService';
import { ISubmissionService } from '../services/contracts/ISubmissionService';
import { IClientService } from '../services/contracts/IClientService';
import { IVendorService } from '../services/contracts/IVendorService';
import { IRecruiterService } from '../services/contracts/IRecruiterService';

import { FirebaseCandidateService } from '../services/firebase/FirebaseCandidateService';
import { FirebaseRequirementService } from '../services/firebase/FirebaseRequirementService';
import { FirebaseSubmissionService } from '../services/firebase/FirebaseSubmissionService';
import { FirebaseClientService } from '../services/firebase/FirebaseClientService';
import { FirebaseVendorService } from '../services/firebase/FirebaseVendorService';
import { FirebaseRecruiterService } from '../services/firebase/FirebaseRecruiterService';

class ServiceProviderLayer {
  public candidateService: ICandidateService;
  public requirementService: IRequirementService;
  public submissionService: ISubmissionService;
  public clientService: IClientService;
  public vendorService: IVendorService;
  public recruiterService: IRecruiterService;

  constructor() {
    this.candidateService = new FirebaseCandidateService();
    this.requirementService = new FirebaseRequirementService();
    this.submissionService = new FirebaseSubmissionService();
    this.clientService = new FirebaseClientService();
    this.vendorService = new FirebaseVendorService();
    this.recruiterService = new FirebaseRecruiterService();
  }
}

export const ServiceProvider = new ServiceProviderLayer();
