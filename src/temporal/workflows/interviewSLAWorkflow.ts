import { TemporalContext } from '../types/TemporalContext';
import { InterviewActivities } from '../activities/InterviewActivities';

export const interviewSLAWorkflow = async (context: TemporalContext, interviewId: string) => {
  console.log(`[Workflow: InterviewSLA] Started for interview ${interviewId}`);
  
  // 1. Start 48h timer (simulated via sleep)
  // await sleep('48h');

  // 2. Check if feedback exists
  const hasFeedback = await InterviewActivities.confirmInterviewFeedbackSubmitted(context, interviewId);

  // 3. Act based on condition
  if (!hasFeedback) {
    await InterviewActivities.escalateFeedbackOverdue(context, interviewId);
    console.log(`[Workflow: InterviewSLA] Emitted INTERVIEW_FEEDBACK_OVERDUE`);
  } else {
    console.log(`[Workflow: InterviewSLA] Completed gracefully for ${interviewId}`);
  }
};
