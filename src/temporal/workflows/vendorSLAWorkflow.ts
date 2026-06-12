import { TemporalContext } from '../types/TemporalContext';
import { SubmissionActivities } from '../activities/SubmissionActivities';
import { NotificationActivities } from '../activities/NotificationActivities';

export const vendorSLAWorkflow = async (context: TemporalContext, requirementId: string, vendorId: string) => {
  console.log(`[Workflow: VendorSLA] Started for vendor ${vendorId} regarding requirement ${requirementId}`);

  // 1. Start 48h timer
  // await sleep('48h');

  // 2. Check submissions
  // const hasSubmissions = await SubmissionActivities.checkVendorSubmissions(context, requirementId, vendorId);
  const hasSubmissions = false; // logic stub

  // 3. Escalate if breached
  if (!hasSubmissions) {
    await NotificationActivities.sendSystemAlert(context, `Vendor ${vendorId} breached 48h SLA for ${requirementId}`);
    console.log(`[Workflow: VendorSLA] Emitted VENDOR_SLA_BREACHED`);
  }
};
