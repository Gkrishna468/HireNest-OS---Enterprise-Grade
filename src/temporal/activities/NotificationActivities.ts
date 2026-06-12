import { TemporalContext } from '../types/TemporalContext';

export const NotificationActivities = {
  async sendEmail(context: TemporalContext, to: string, templateId: string, payload: any): Promise<void> {
    console.log(`[NotificationActivities] Sending email to ${to} (Trace: ${context.traceId})`);
  },
  
  async sendSystemAlert(context: TemporalContext, message: string): Promise<void> {
    console.log(`[NotificationActivities] System Alert: ${message}`);
  }
};
