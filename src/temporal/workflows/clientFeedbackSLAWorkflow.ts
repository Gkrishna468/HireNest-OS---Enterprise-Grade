import { TemporalContext } from '../types/TemporalContext';
import { NotificationActivities } from '../activities/NotificationActivities';

export const clientFeedbackSLAWorkflow = async (context: TemporalContext, submissionId: string) => {
  console.log(`[Workflow: ClientFeedbackSLA] Started for submission ${submissionId}`);

  // 1. 72h Timer
  // await sleep('72h');

  // 2. Check client response state
  // const hasResponded = ...
  const hasResponded = false; // logic stub

  // 3. Remind + escalate if no response
  if (!hasResponded) {
    await NotificationActivities.sendSystemAlert(context, `Client feedback overdue for submission ${submissionId}`);
    console.log(`[Workflow: ClientFeedbackSLA] Emitted CLIENT_FEEDBACK_OVERDUE`);
  }
};
