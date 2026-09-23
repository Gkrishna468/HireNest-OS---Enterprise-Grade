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
        
        // Extract the actual Google-generated Meet conference entry point (video link)
        const videoEntryPoint = eventResult.conferenceData?.entryPoints?.find(
          (ep: any) => ep.entryPointType === "video"
        );
        meetingLink = videoEntryPoint?.uri || eventResult.hangoutLink || undefined;
      } catch (err: any) {
        if (err.message?.includes("OAuth") || err.message?.includes("token") || err.message?.includes("connected")) {
          const customErr: any = new Error("CALENDAR_CONNECTION_REQUIRED: Google Calendar OAuth connection is required to create a Google Meet event.");
          customErr.code = "CALENDAR_CONNECTION_REQUIRED";
          throw customErr;
        }
        
        // Return structured failure code and do NOT mark as SCHEDULED
        const customErr: any = new Error(`GOOGLE_MEET_CREATION_FAILED: Failed to create Google Calendar/Meet event: ${err.message}`);
        customErr.code = "GOOGLE_MEET_CREATION_FAILED";
        throw customErr;
      }
    }

    const updateData: Partial<Interview> = {
      status: "SCHEDULED",
      scheduledStart: event.start.dateTime,
      scheduledEnd: event.end.dateTime,
      timezone: event.start.timeZone || "UTC",
      calendarEventId,
      meetingProvider: createMeet ? "GOOGLE_MEET" : (meetingLink ? "MANUAL" : "NONE"),
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

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    const currentDoc = await interviewRef.get();
    if (!currentDoc.exists) throw new Error(`Interview not found: ${interviewId}`);
    const currentData = currentDoc.data() as Interview;

    let calendarEventId: string | undefined = undefined;
    let meetingLink: string | undefined = undefined;

    if (currentData.calendarEventId) {
      try {
        console.log(`[InterviewOrchestration] Updating existing calendar event in place: ${currentData.calendarEventId}`);
        const eventResult = await CalendarService.updateEvent(uid, currentData.calendarEventId, event, createMeet);
        calendarEventId = eventResult.id;
        
        const videoEntryPoint = eventResult.conferenceData?.entryPoints?.find(
          (ep: any) => ep.entryPointType === "video"
        );
        meetingLink = videoEntryPoint?.uri || eventResult.hangoutLink || undefined;
      } catch (err: any) {
        if (err.message?.includes("OAuth") || err.message?.includes("token") || err.message?.includes("connected")) {
          const customErr: any = new Error("CALENDAR_CONNECTION_REQUIRED: Google Calendar OAuth connection is required to update a Google Meet event.");
          customErr.code = "CALENDAR_CONNECTION_REQUIRED";
          throw customErr;
        }
        const customErr: any = new Error(`GOOGLE_MEET_CREATION_FAILED: Failed to update Google Calendar/Meet event: ${err.message}`);
        customErr.code = "GOOGLE_MEET_CREATION_FAILED";
        throw customErr;
      }
    } else if (createMeet || event.attendees?.length) {
      try {
        console.log("[InterviewOrchestration] No previous event exists, creating new calendar event...");
        const eventResult = await CalendarService.createEvent(uid, event, createMeet);
        calendarEventId = eventResult.id;
        
        const videoEntryPoint = eventResult.conferenceData?.entryPoints?.find(
          (ep: any) => ep.entryPointType === "video"
        );
        meetingLink = videoEntryPoint?.uri || eventResult.hangoutLink || undefined;
      } catch (err: any) {
        if (err.message?.includes("OAuth") || err.message?.includes("token") || err.message?.includes("connected")) {
          const customErr: any = new Error("CALENDAR_CONNECTION_REQUIRED: Google Calendar OAuth connection is required to create a Google Meet event.");
          customErr.code = "CALENDAR_CONNECTION_REQUIRED";
          throw customErr;
        }
        const customErr: any = new Error(`GOOGLE_MEET_CREATION_FAILED: Failed to create Google Calendar/Meet event: ${err.message}`);
        customErr.code = "GOOGLE_MEET_CREATION_FAILED";
        throw customErr;
      }
    }

    const updateData: Partial<Interview> = {
      status: "SCHEDULED",
      scheduledStart: event.start.dateTime,
      scheduledEnd: event.end.dateTime,
      timezone: event.start.timeZone || "UTC",
      calendarEventId: calendarEventId || currentData.calendarEventId,
      meetingProvider: createMeet ? "GOOGLE_MEET" : (meetingLink ? "MANUAL" : "NONE"),
      meetingLink: meetingLink || currentData.meetingLink,
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

  public static async cancelInterview(uid: string, interviewId: string, reason: string): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    await this.validateTransition(interviewId, "CANCELLED");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    const currentDoc = await interviewRef.get();
    const currentData = currentDoc.exists ? currentDoc.data() as Interview : null;

    // Delete Google Calendar event if it exists
    if (currentData?.calendarEventId) {
      try {
        console.log(`[InterviewOrchestration] Deleting calendar event on cancellation: ${currentData.calendarEventId}`);
        await CalendarService.deleteEvent(uid, currentData.calendarEventId);
      } catch (delErr: any) {
        console.warn("[InterviewOrchestration] Failed to delete calendar event during cancellation:", delErr.message);
      }
    }

    await interviewRef.update({ 
      status: "CANCELLED", 
      calendarEventId: null,
      meetingLink: null,
      updatedAt: new Date().toISOString() 
    });
    
    const cancelledInterview = { ...(await interviewRef.get()).data() } as Interview;
    await EventBus.publish("INTERVIEW_CANCELLED", { ...cancelledInterview, reason }, "InterviewOrchestrationService", cancelledInterview.organizationId);
    
    return cancelledInterview;
  }

  public static async startInterview(interviewId: string, sessionId: string): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    const currentDoc = await adminDb.collection("interviews").doc(interviewId).get();
    if (!currentDoc.exists) throw new Error(`Interview not found: ${interviewId}`);
    const currentStatus = currentDoc.data()?.status;

    if (currentStatus === "IN_PROGRESS") {
      console.log(`[InterviewOrchestrationService] Interview is already IN_PROGRESS. (Idempotent bypass)`);
      const existingSessionId = currentDoc.data()?.sessionId;
      if (sessionId && sessionId !== existingSessionId) {
        await adminDb.collection("interviews").doc(interviewId).update({ sessionId, updatedAt: new Date().toISOString() });
        return { ...(await adminDb.collection("interviews").doc(interviewId).get()).data() } as Interview;
      }
      return { ...currentDoc.data() } as Interview;
    }

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
