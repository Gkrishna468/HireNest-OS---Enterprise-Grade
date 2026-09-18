import { ICandidateService } from '../services/contracts/ICandidateService.js';
import { IRequirementService } from '../services/contracts/IRequirementService.js';
import { ISubmissionService } from '../services/contracts/ISubmissionService.js';
import { IClientService } from '../services/contracts/IClientService.js';
import { IVendorService } from '../services/contracts/IVendorService.js';
import { IRecruiterService } from '../services/contracts/IRecruiterService.js';
import { IIdentityService } from '../services/contracts/IIdentityService.js';
import { IEventService } from '../services/contracts/IEventService.js';

import { FirebaseCandidateService } from '../services/firebase/FirebaseCandidateService.js';
import { FirebaseRequirementService } from '../services/firebase/FirebaseRequirementService.js';
import { FirebaseSubmissionService } from '../services/firebase/FirebaseSubmissionService.js';
import { FirebaseClientService } from '../services/firebase/FirebaseClientService.js';
import { FirebaseVendorService } from '../services/firebase/FirebaseVendorService.js';
import { FirebaseRecruiterService } from '../services/firebase/FirebaseRecruiterService.js';
import { FirebaseIdentityService } from '../services/firebase/FirebaseIdentityService.js';
import { FirebaseEventService } from '../services/firebase/FirebaseEventService.js';

class ServiceProviderLayer {
  public candidateService: ICandidateService;
  public requirementService: IRequirementService;
  public submissionService: ISubmissionService;
  public clientService: IClientService;
  public vendorService: IVendorService;
  public recruiterService: IRecruiterService;
  public identityService: IIdentityService;
  public eventService: IEventService;

  constructor() {
    this.candidateService = new FirebaseCandidateService();
    this.requirementService = new FirebaseRequirementService();
    this.submissionService = new FirebaseSubmissionService();
    this.clientService = new FirebaseClientService();
    this.vendorService = new FirebaseVendorService();
    this.recruiterService = new FirebaseRecruiterService();
    this.identityService = new FirebaseIdentityService();
    this.eventService = new FirebaseEventService();
  }
}

export const ServiceProvider = new ServiceProviderLayer();
