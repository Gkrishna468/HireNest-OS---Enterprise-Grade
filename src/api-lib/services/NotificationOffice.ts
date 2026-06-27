import { adminDb } from '../../lib/firebase-admin.js';
import { PrivacyService } from './PrivacyService.js';

export class NotificationOffice {
  /**
   * Main entrypoint for processing events flowing through the EventBus.
   */
  public static async handleEvent(eventName: string, payload: any): Promise<void> {
    console.log(`[Notification Office] Processing event: ${eventName}`, payload);
    
    try {
      switch (eventName) {
        case 'SUBMISSION_CREATED':
          await this.processSubmissionCreated(payload);
          break;
          
        case 'SUBMISSION_STATUS_UPDATED':
          await this.processSubmissionStatusUpdated(payload);
          break;
          
        case 'REQUIREMENT_CREATED':
          await this.processRequirementCreated(payload);
          break;
          
        case 'INTERVIEW_SCHEDULED':
          await this.processInterviewScheduled(payload);
          break;
          
        default:
          console.log(`[Notification Office] Unhandled event: ${eventName}`);
      }
    } catch (err) {
      console.error(`[Notification Office] Error processing event ${eventName}:`, err);
    }
  }

  private static async processSubmissionCreated(payload: any): Promise<void> {
    const { submissionId, candidateId, requirementId, vendorId, clientId, candidateName, matchScore } = payload;
    const reqTitle = payload.requirementTitle || 'Strategic Role';

    const notifBase = {
      type: 'SUBMISSION',
      submissionId,
      requirementId,
      createdAt: new Date(),
      read: false
    };

    // 1. Client Notification
    if (clientId) {
      await adminDb.collection('notifications').add({
        ...notifBase,
        recipientId: clientId,
        title: 'New Candidate Submitted',
        message: `New Candidate ${candidateName || 'Anonymous'} has been submitted for ${reqTitle} with a Match Score of ${matchScore || 0}%.`,
        actionUrl: `/candidates`
      });
    }

    // 2. Vendor Notification
    if (vendorId) {
      await adminDb.collection('notifications').add({
        ...notifBase,
        recipientId: vendorId,
        title: 'Candidate Submitted Successfully',
        message: `Your candidate ${candidateName || 'Anonymous'} has been successfully submitted to CL-${clientId?.slice(-4).toUpperCase() || '2847'}.`,
        actionUrl: `/candidates`
      });
    }

    // 3. HQ Notification
    await adminDb.collection('notifications').add({
      ...notifBase,
      recipientId: 'ORG-GLOBAL-HQ',
      title: 'Global Submission: New Candidate',
      message: `Vendor ${vendorId || 'Unknown'} submitted ${candidateName || 'Anonymous'} for Client ${clientId || 'Unknown'} (${reqTitle}). Match: ${matchScore || 0}%.`,
      actionUrl: `/candidates`
    });
  }

  private static async processSubmissionStatusUpdated(payload: any): Promise<void> {
    const { submissionId, status, rejectReason, feedback, gapAnalysis, resumeSuggestions, candidateName, vendorId, clientId } = payload;

    const notifBase = {
      type: 'STATUS_UPDATE',
      submissionId,
      status,
      createdAt: new Date(),
      read: false
    };

    if (status === 'REJECTED') {
      // 1. Vendor (Recovery Notification with AI Coaching!)
      if (vendorId) {
        await adminDb.collection('notifications').add({
          ...notifBase,
          recipientId: vendorId,
          title: '⚠️ Action Required: Candidate Recovery Center',
          message: `Your candidate ${candidateName || 'Anonymous'} was rejected for CL-${clientId?.slice(-4).toUpperCase() || '2847'}. Reason: ${rejectReason || 'Not Specified'}. Resume suggestions available for resubmission.`,
          actionUrl: `/interviews?view=recovery`
        });
      }

      // 2. Client Notification
      if (clientId) {
        await adminDb.collection('notifications').add({
          ...notifBase,
          recipientId: clientId,
          title: 'Candidate Rejected',
          message: `${candidateName || 'Anonymous'} has been rejected. Reason: ${rejectReason || 'Not Specified'}.`,
          actionUrl: `/candidates`
        });
      }

      // 3. HQ Notification
      await adminDb.collection('notifications').add({
        ...notifBase,
        recipientId: 'ORG-GLOBAL-HQ',
        title: 'Candidate Rejected (Audit)',
        message: `Candidate ${candidateName} (Vendor: ${vendorId}) rejected by Client ${clientId}. SLA timer logged.`,
        actionUrl: `/candidates`
      });
    } else {
      // General Advances
      const title = `Pipeline Advanced: ${status}`;
      const message = `Candidate ${candidateName || 'Anonymous'} progressed to ${status}.`;

      if (clientId) {
        await adminDb.collection('notifications').add({
          ...notifBase,
          recipientId: clientId,
          title,
          message,
          actionUrl: `/candidates`
        });
      }

      if (vendorId) {
        await adminDb.collection('notifications').add({
          ...notifBase,
          recipientId: vendorId,
          title,
          message: `Your candidate ${candidateName || 'Anonymous'} progressed to ${status} with CL-${clientId?.slice(-4).toUpperCase() || '2847'}.`,
          actionUrl: `/candidates`
        });
      }

      await adminDb.collection('notifications').add({
        ...notifBase,
        recipientId: 'ORG-GLOBAL-HQ',
        title: `[HQ] ${title}`,
        message: `Candidate ${candidateName || 'Anonymous'} (Vendor: ${vendorId}) progressed to ${status} for Client ${clientId}.`,
        actionUrl: `/candidates`
      });
    }
  }

  private static async processRequirementCreated(payload: any): Promise<void> {
    const { id, title, skills, clientId } = payload;

    // Notify ALL Vendors (With masked details!)
    const snap = await adminDb.collection('organizations').where('type', '==', 'vendor').get();
    
    const notifBase = {
      type: 'NEW_JOB',
      requirementId: id,
      createdAt: new Date(),
      read: false
    };

    const maskedClientId = clientId ? `CL-${clientId.slice(-4).toUpperCase()}` : 'CL-2847';

    for (const d of snap.docs) {
      await adminDb.collection('notifications').add({
        ...notifBase,
        recipientId: d.id,
        title: '🔥 New Opportunity Available',
        message: `New requirement published by ${maskedClientId}: "${title}". Required Skills: ${skills?.join(', ') || 'Various'}. Apply now!`,
        actionUrl: `/jobs`
      });
    }

    // HQ Notification
    await adminDb.collection('notifications').add({
      ...notifBase,
      recipientId: 'ORG-GLOBAL-HQ',
      title: 'New Job Posted',
      message: `Client ${clientId} posted job: "${title}". Matching engine initiated.`,
      actionUrl: `/jobs`
    });
  }

  private static async processInterviewScheduled(payload: any): Promise<void> {
    const { submissionId, candidateName, date, time, vendorId, clientId, round } = payload;

    const notifBase = {
      type: 'INTERVIEW',
      submissionId,
      createdAt: new Date(),
      read: false
    };

    const title = '📅 Interview Scheduled';
    const message = `${round || 'Interview'} scheduled for ${candidateName} on ${date} at ${time}.`;

    if (clientId) {
      await adminDb.collection('notifications').add({
        ...notifBase,
        recipientId: clientId,
        title,
        message,
        actionUrl: `/deal-rooms`
      });
    }

    if (vendorId) {
      await adminDb.collection('notifications').add({
        ...notifBase,
        recipientId: vendorId,
        title,
        message: `${round || 'Interview'} scheduled for your candidate ${candidateName} with CL-${clientId?.slice(-4).toUpperCase() || '2847'} on ${date} at ${time}.`,
        actionUrl: `/deal-rooms`
      });
    }

    await adminDb.collection('notifications').add({
      ...notifBase,
      recipientId: 'ORG-GLOBAL-HQ',
      title,
      message: `Interview for ${candidateName} (Vendor: ${vendorId}, Client: ${clientId}) scheduled on ${date} at ${time}.`,
      actionUrl: `/deal-rooms`
    });
  }
}
