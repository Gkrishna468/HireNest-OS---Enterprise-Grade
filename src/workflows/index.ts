import { WorkflowRegistry } from './WorkflowRegistry';
import { SubmissionWorkflow } from './SubmissionWorkflow';
import { InterviewWorkflow } from './InterviewWorkflow';
import { OfferWorkflow } from './OfferWorkflow';
import { VendorWorkflow } from './VendorWorkflow';
import { EventTypes } from '../lib/events/EventTypes';

export function initializeWorkflows() {
  const registry = WorkflowRegistry.getInstance();

  // Submission Workflows
  const subWf = new SubmissionWorkflow();
  registry.register(EventTypes.SUBMISSION_CREATED, subWf);

  // Interview Workflows
  const intWf = new InterviewWorkflow();
  registry.register(EventTypes.INTERVIEW_REQUESTED, intWf);
  registry.register(EventTypes.INTERVIEW_SCHEDULED, intWf);
  registry.register(EventTypes.INTERVIEW_FEEDBACK_ADDED, intWf);

  // Offer Workflows
  const offerWf = new OfferWorkflow();
  registry.register(EventTypes.OFFER_STATUS_UPDATED, offerWf);
  registry.register(EventTypes.JOINING_STATUS_UPDATED, offerWf);

  // Vendor Workflows
  const vendorWf = new VendorWorkflow();
  registry.register(EventTypes.JOB_PUBLISHED, vendorWf);

  console.log('[WorkflowRegistry] All core workflows registered.');
}
