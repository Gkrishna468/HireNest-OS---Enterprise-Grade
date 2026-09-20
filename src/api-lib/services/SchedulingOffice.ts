import { db } from '../../lib/firebase-admin.js';
import { EventBus } from './EventBus.js';
import { CalendarService } from './CalendarService.js';
import { BusinessGraphService } from './BusinessGraphService.js';

export class SchedulingOffice {
    
    /**
     * Entry point for handling business events related to scheduling.
     */
    static async handleEvent(type: string, payload: any, orgId?: string) {
        if (!db) return;
        
        console.log(`[SchedulingOffice] Processing event ${type} in Scheduling Office...`);
        
        try {
            switch (type) {
                case 'INTERVIEW_REQUESTED': {
                    await this.handleInterviewRequested(payload, orgId);
                    break;
                }
                case 'CALENDAR_SYNC_REQUESTED': {
                    await this.syncCalendar(payload.uid, orgId);
                    break;
                }
                default:
                    console.log(`[SchedulingOffice] Event type ${type} ignored by Scheduling Office.`);
            }
        } catch (error) {
            console.error(`[SchedulingOffice] Error handling event ${type}:`, error);
        }
    }

    private static async handleInterviewRequested(payload: any, orgId?: string) {
        const candidateId = payload.candidateId || payload.interviewDetails?.candidateId;
        const requirementId = payload.requirementId || payload.interviewDetails?.requirementId;
        const uid = payload.uid;
        
        const interviewDetails = payload.interviewDetails || {};
        const mode = interviewDetails.mode || payload.mode || "";
        const isGoogleMeet = mode === "Google Meet";

        let finalStartTime = payload.startTime;
        if (!finalStartTime && (payload.date || interviewDetails.date)) {
            const d = payload.date || interviewDetails.date;
            const t = payload.time || interviewDetails.time || "09:00";
            finalStartTime = `${d}T${t}`;
        }

        const durationMinutes = payload.durationMinutes || interviewDetails.durationMinutes || 30;
        const interviewerId = payload.interviewerId || interviewDetails.interviewer || "system";
        
        if (!uid || !finalStartTime || !candidateId || !requirementId) {
            console.error("[SchedulingOffice] Missing required fields for interview scheduling:", { uid, finalStartTime, candidateId, requirementId });
            return;
        }

        console.log(`[SchedulingOffice] Scheduling interview for candidate ${candidateId} and requirement ${requirementId} via mode: ${mode}`);

        try {
            // 1. Fetch Candidate and Requirement data for the event description
            const candDoc = await db.collection("candidatePool").doc(candidateId).get();
            const reqDoc = await db.collection("requirements_public").doc(requirementId).get();
            
            const candData = candDoc.data() || {};
            const reqData = reqDoc.data() || {};

            const start = new Date(finalStartTime);
            const end = new Date(start.getTime() + (durationMinutes || 30) * 60000);

            // 2. Create Google Calendar Event
            const eventDetails = {
                summary: `Interview: ${candData.name || 'Candidate'} for ${reqData.title || 'Role'}`,
                description: `Interview scheduled via HireNestOS.\n\nCandidate: ${candData.name}\nRole: ${reqData.title}\nRequirement ID: ${requirementId}`,
                start: {
                    dateTime: start.toISOString(),
                },
                end: {
                    dateTime: end.toISOString(),
                },
                attendees: candData.email ? [{ email: candData.email }] : [],
            };

            const calendarEvent = await CalendarService.createEvent(uid, eventDetails, isGoogleMeet);
            const hangoutLink = calendarEvent.hangoutLink || "";
            console.log(`[SchedulingOffice] Calendar event created: ${calendarEvent.id}, Google Meet URL: ${hangoutLink}`);

            // 3. Update Business Graph
            await BusinessGraphService.addRelationship(
                candidateId,
                requirementId,
                'INTERVIEW_SCHEDULED',
                { 
                    eventId: calendarEvent.id, 
                    startTime: start.toISOString(),
                    interviewerId,
                    meetingLink: hangoutLink || interviewDetails.meetingLink || ""
                }
            );

            // 4. Update Submission Status and Meeting details if applicable
            const subId = `${candidateId}_${requirementId}`;
            const subUpdates: any = {
                status: 'INTERVIEWING',
                interviewScheduled: true,
                lastInterviewId: calendarEvent.id,
                updatedAt: new Date().toISOString()
            };

            if (hangoutLink) {
                subUpdates.meetingLink = hangoutLink;
                subUpdates.interviewDetails = {
                    ...interviewDetails,
                    meetingLink: hangoutLink
                };
            }

            await db.collection("submissions").doc(subId).set(subUpdates, { merge: true });

            // 5. Publish Event
            await EventBus.publish('INTERVIEW_SCHEDULED', {
                candidateId,
                requirementId,
                eventId: calendarEvent.id,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                meetingLink: hangoutLink
            }, 'SCHEDULING_OFFICE', orgId);

        } catch (err: any) {
            console.error("[SchedulingOffice] Failed to schedule interview:", err.message);
            
            // Notify user of failure
            await db.collection("notifications").add({
                type: 'SYSTEM_ERROR',
                title: 'Failed to schedule interview',
                message: `Error: ${err.message}. Please check your calendar connection.`,
                recipientId: uid,
                createdAt: new Date(),
                read: false
            });
        }
    }

    private static async syncCalendar(uid: string, orgId?: string) {
        try {
            const events = await CalendarService.listEvents(uid);
            console.log(`[SchedulingOffice] Synced ${events.length} events for user ${uid}`);
            
            // Update workspace connection status
            await db.collection("workspace_connections").doc(uid).set({
                lastSync: new Date().toISOString(),
                calendarStatus: 'ACTIVE'
            }, { merge: true });

        } catch (err: any) {
            console.error("[SchedulingOffice] Calendar sync failed:", err.message);
        }
    }
}
