import { adminDb } from "../../lib/firebase-admin.js";
import { CalendarService, CalendarEvent } from "./CalendarService.js";
import { EventBus } from "./EventBus.js";

export type InterviewStatus = "DRAFT" | "SCHEDULED" | "INVITED" | "CANDIDATE_VERIFIED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export interface Interview {
  interviewId: string;
  type: "AI_SCREENING" | "HUMAN";
  candidateId: string;
  submissionId: string;
  requirementId: string;
  organizationId: string;
  vendorId?: string;
  clientId?: string;
  sessionId?: string;
  status: InterviewStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  timezone?: string;
  meetingProvider?: "GOOGLE_MEET" | "MANUAL" | "NONE";
  meetingLink?: string;
  calendarEventId?: string;
  createdBy: string;
  createdByRole: string;
  candidateInvitationId?: string;
  aiInterviewReportId?: string;
  createdAt: string;
  updatedAt: string;
}

export class InterviewOrchestrationService {
  private static VALID_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
    DRAFT: ["SCHEDULED", "CANCELLED"],
    SCHEDULED: ["INVITED", "SCHEDULED", "CANCELLED"],
    INVITED: ["CANDIDATE_VERIFIED", "SCHEDULED", "CANCELLED", "EXPIRED"],
    CANDIDATE_VERIFIED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    EXPIRED: []
  };

  private static async validateTransition(interviewId: string, targetStatus: InterviewStatus): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");
    const doc = await adminDb.collection("interviews").doc(interviewId).get();
    if (!doc.exists) throw new Error(`Interview not found: ${interviewId}`);
    const interviewData = doc.data() as Interview;
    const currentStatus = interviewData.status as InterviewStatus;
    
    if (!this.VALID_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
      throw new Error(`Invalid transition from ${currentStatus} to ${targetStatus} for interview ${interviewId}`);
    }
    return interviewData;
  }

  public static async createAIInterview(data: Omit<Interview, 'interviewId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");
    
    // Idempotency check: look for existing active interview
    const existingSnap = await adminDb.collection("interviews")
      .where("candidateId", "==", data.candidateId)
      .where("requirementId", "==", data.requirementId)
      .where("type", "==", data.type)
      .get();

    for (const doc of existingSnap.docs) {
      const existing = doc.data() as Interview;
      if (!["CANCELLED", "EXPIRED"].includes(existing.status)) {
        console.log(`[InterviewOrchestration] Reusing idempotent active interview ${existing.interviewId}`);
        return existing;
      }
    }

    const interviewId = adminDb.collection("interviews").doc().id;
    const now = new Date().toISOString();
    const interview: Interview = {
      ...data,
      interviewId,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now
    };
    
    await adminDb.collection("interviews").doc(interviewId).set(interview);
    await EventBus.publish("AI_INTERVIEW_CREATED", interview, "InterviewOrchestrationService", interview.organizationId);
    
    return interview;
  }

  public static async scheduleAIInterview(
    uid: string, 
    interviewId: string, 
    event: CalendarEvent, 
    createMeet: boolean
  ): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    await this.validateTransition(interviewId, "SCHEDULED");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    let calendarEventId: string | undefined = undefined;
    let meetingLink: string | undefined = undefined;

    if (createMeet || event.attendees?.length) {
      try {
        const eventResult = await CalendarService.createEvent(uid, event, createMeet);
        calendarEventId = eventResult.id;
        meetingLink = eventResult.hangoutLink || undefined;
      } catch (err: any) {
        if (err.message?.includes("OAuth") || err.message?.includes("token")) {
          const customErr: any = new Error("CALENDAR_CONNECTION_REQUIRED: Google Calendar OAuth connection is required to create a Google Meet event.");
          customErr.code = "CALENDAR_CONNECTION_REQUIRED";
          throw customErr;
        }
        console.warn("[InterviewOrchestration] Calendar event creation failed, proceeding with manual link:", err.message);
      }
    }

    const updateData: Partial<Interview> = {
      status: "SCHEDULED",
      scheduledStart: event.start.dateTime,
      scheduledEnd: event.end.dateTime,
      timezone: event.start.timeZone || "UTC",
      calendarEventId,
      meetingProvider: meetingLink ? "GOOGLE_MEET" : "NONE",
      meetingLink,
      updatedAt: new Date().toISOString()
    };

    await interviewRef.update(updateData);
    const updatedInterview = { ...(await interviewRef.get()).data() } as Interview;
    
    await EventBus.publish("AI_INTERVIEW_SCHEDULED", updatedInterview, "InterviewOrchestrationService", updatedInterview.organizationId);
    
    return updatedInterview;
  }

  public static async rescheduleInterview(
    uid: string,
    interviewId: string,
    event: CalendarEvent,
    createMeet: boolean
  ): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    await this.validateTransition(interviewId, "SCHEDULED");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    let meetingLink: string | undefined = undefined;

    try {
      const eventResult = await CalendarService.createEvent(uid, event, createMeet);
      meetingLink = eventResult.hangoutLink || undefined;
    } catch (err: any) {
      console.warn("[InterviewOrchestration] Calendar update failed during reschedule:", err.message);
    }

    const updateData: Partial<Interview> = {
      status: "SCHEDULED",
      scheduledStart: event.start.dateTime,
      scheduledEnd: event.end.dateTime,
      timezone: event.start.timeZone || "UTC",
      meetingLink: meetingLink || (await interviewRef.get()).data()?.meetingLink,
      updatedAt: new Date().toISOString()
    };

    await interviewRef.update(updateData);
    const rescheduled = { ...(await interviewRef.get()).data() } as Interview;

    await EventBus.publish("INTERVIEW_RESCHEDULED", rescheduled, "InterviewOrchestrationService", rescheduled.organizationId);

    return rescheduled;
  }

  public static async inviteCandidate(interviewId: string, candidateEmail: string): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    await this.validateTransition(interviewId, "INVITED");

    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const interviewRef = adminDb.collection("interviews").doc(interviewId);

    const updateData: Partial<Interview> = {
      status: "INVITED",
      candidateInvitationId: invitationId,
      updatedAt: new Date().toISOString()
    };

    await interviewRef.update(updateData);
    const invitedInterview = { ...(await interviewRef.get()).data() } as Interview;

    await EventBus.publish("AI_INTERVIEW_INVITED", { ...invitedInterview, candidateEmail }, "InterviewOrchestrationService", invitedInterview.organizationId);

    return invitedInterview;
  }

  public static async attachMeeting(interviewId: string, meetingLink: string, provider: "GOOGLE_MEET" | "MANUAL" = "MANUAL"): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    await interviewRef.update({
      meetingLink,
      meetingProvider: provider,
      updatedAt: new Date().toISOString()
    });

    return { ...(await interviewRef.get()).data() } as Interview;
  }

  public static async cancelInterview(interviewId: string, reason: string): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    await this.validateTransition(interviewId, "CANCELLED");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    await interviewRef.update({ status: "CANCELLED", updatedAt: new Date().toISOString() });
    
    const cancelledInterview = { ...(await interviewRef.get()).data() } as Interview;
    await EventBus.publish("INTERVIEW_CANCELLED", { ...cancelledInterview, reason }, "InterviewOrchestrationService", cancelledInterview.organizationId);
    
    return cancelledInterview;
  }

  public static async startInterview(interviewId: string, sessionId: string): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    const currentDoc = await adminDb.collection("interviews").doc(interviewId).get();
    if (!currentDoc.exists) throw new Error(`Interview not found: ${interviewId}`);
    const currentStatus = currentDoc.data()?.status;

    // Allow transition from DRAFT, SCHEDULED, INVITED, or CANDIDATE_VERIFIED to IN_PROGRESS
    if (!["DRAFT", "SCHEDULED", "INVITED", "CANDIDATE_VERIFIED"].includes(currentStatus)) {
      throw new Error(`Cannot start interview in status ${currentStatus}`);
    }

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    await interviewRef.update({ status: "IN_PROGRESS", sessionId, updatedAt: new Date().toISOString() });
    
    const startedInterview = { ...(await interviewRef.get()).data() } as Interview;
    await EventBus.publish("AI_INTERVIEW_STARTED", startedInterview, "InterviewOrchestrationService", startedInterview.organizationId);
    
    return startedInterview;
  }

  public static async completeInterview(interviewId: string, reportId: string): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    await this.validateTransition(interviewId, "COMPLETED");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    await interviewRef.update({ status: "COMPLETED", aiInterviewReportId: reportId, updatedAt: new Date().toISOString() });
    
    const completedInterview = { ...(await interviewRef.get()).data() } as Interview;
    await EventBus.publish("AI_INTERVIEW_COMPLETED", completedInterview, "InterviewOrchestrationService", completedInterview.organizationId);
    
    return completedInterview;
  }

  public static async expireInterview(interviewId: string): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    await this.validateTransition(interviewId, "EXPIRED");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    await interviewRef.update({ status: "EXPIRED", updatedAt: new Date().toISOString() });

    return { ...(await interviewRef.get()).data() } as Interview;
  }

  public static async publishInterviewReport(interviewId: string, reportData: any): Promise<void> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await adminDb.collection("ai_interview_reports").doc(reportId).set({
      reportId,
      interviewId,
      ...reportData,
      createdAt: new Date().toISOString()
    });

    await adminDb.collection("interviews").doc(interviewId).update({
      aiInterviewReportId: reportId,
      updatedAt: new Date().toISOString()
    });

    const doc = await adminDb.collection("interviews").doc(interviewId).get();
    const interview = doc.data() as Interview;

    await EventBus.publish("AI_INTERVIEW_REPORT_PUBLISHED", { reportId, interview, reportData }, "InterviewOrchestrationService", interview.organizationId);
  }
}
