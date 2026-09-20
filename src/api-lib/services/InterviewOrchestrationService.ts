import { adminDb } from "../../lib/firebase-admin.js";
import { CalendarService, CalendarEvent } from "./CalendarService.js";

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
  status: "DRAFT" | "SCHEDULED" | "INVITED" | "CANDIDATE_VERIFIED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED";
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
  public static async createAIInterview(data: Omit<Interview, 'interviewId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");
    
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
    return interview;
  }

  public static async scheduleAIInterview(
    uid: string, 
    interviewId: string, 
    event: CalendarEvent, 
    createMeet: boolean
  ): Promise<Interview> {
    if (!adminDb) throw new Error("Firestore Admin DB is not initialized");

    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    const interviewSnapshot = await interviewRef.get();
    if (!interviewSnapshot.exists) throw new Error("Interview not found");

    const eventResult = await CalendarService.createEvent(uid, event, createMeet);

    const updateData: Partial<Interview> = {
      status: "SCHEDULED",
      scheduledStart: event.start.dateTime,
      scheduledEnd: event.end.dateTime,
      timezone: event.start.timeZone,
      calendarEventId: eventResult.id,
      meetingProvider: createMeet ? "GOOGLE_MEET" : "MANUAL",
      meetingLink: createMeet ? eventResult.hangoutLink : undefined,
      updatedAt: new Date().toISOString()
    };

    await interviewRef.update(updateData);
    
    return { ...interviewSnapshot.data(), ...updateData } as Interview;
  }

