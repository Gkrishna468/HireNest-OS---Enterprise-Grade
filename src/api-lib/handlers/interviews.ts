import { adminDb, runtimeMode } from "../../lib/firebase-admin.js";
import { InterviewOrchestrationService } from "../services/InterviewOrchestrationService.js";
import { CalendarEvent } from "../services/CalendarService.js";

export default async function handler(req: any, res: any) {
  console.log("INTERVIEW HANDLER START");
  console.log("runtimeMode", runtimeMode);
  console.log("adminDb exists", !!adminDb);

  if (!adminDb) {
    console.error("INTERVIEWS_HANDLER_ADMIN_DB_NULL", runtimeMode);
    return res.status(503).json({
      success: false,
      error: "Admin Firestore unavailable",
      runtimeMode,
    });
  }

  if (req.method === "GET") {
    const { candidateId } = req.query;
    let clientId = req.query.clientId as string | undefined;
    let vendorId = req.query.vendorId as string | undefined;

    const userId = req.user?.uid;
    let role = req.user?.role;
    let orgId = req.user?.organizationId;

    try {
      if (userId) {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (userDoc.exists) {
          role = userDoc.data()?.role || role;
          orgId = userDoc.data()?.organizationId || orgId;
        }
      }

      const isAdmin =
        role === "admin" ||
        role === "super_admin" ||
        role === "ops_admin" ||
        role === "hq_admin" ||
        orgId === "ORG-GLOBAL-HQ";

      if (!isAdmin) {
        // Force authorization
        if (role?.includes("vendor") || role?.includes("recruiter")) {
          if (vendorId && vendorId !== orgId)
            return res.status(403).json({ error: "Access Denied" });
          vendorId = orgId;
          clientId = undefined;
        } else {
          if (clientId && clientId !== orgId)
            return res.status(403).json({ error: "Access Denied" });
          clientId = orgId;
          vendorId = undefined;
        }
      }

      let q: FirebaseFirestore.Query = adminDb.collection("interviews");
      if (candidateId) q = q.where("candidateId", "==", candidateId);
      if (clientId) q = q.where("clientId", "==", clientId);
      if (vendorId) q = q.where("vendorId", "==", vendorId);
      const snap = await q.get();
      const interviews = snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        };
      });
      return res.status(200).json({ interviews });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { submission, requirement, isClientAction, formData } = req.body;

      if (!submission || !requirement || !formData) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      console.log("INTERVIEW PAYLOAD", {
        submissionId: submission?.submissionId,
        id: submission?.id,
        candidateId: submission?.candidateId,
        clientId: submission?.clientId,
        vendorId: submission?.vendorId,
        requirementId: requirement?.id,
        isClientAction,
      });

      const subId =
        submission?.submissionId ||
        submission?.id ||
        submission?.submissionRef ||
        null;

      if (!subId) {
        console.error("Submission object received:", submission);
        return res.status(400).json({
          success: false,
          error: "Missing submissionId in interview request",
        });
      }

      // AUTHORIZATION CHECK
      const userId = req.user?.uid;
      let role = req.user?.role;
      let orgId = req.user?.organizationId;

      if (userId) {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (userDoc.exists) {
          role = userDoc.data()?.role || role;
          orgId = userDoc.data()?.organizationId || orgId;
        }
      }

      const isAdmin =
        role === "admin" ||
        role === "super_admin" ||
        role === "ops_admin" ||
        role === "hq_admin" ||
        orgId === "ORG-GLOBAL-HQ";

      const reqClientId = requirement.clientId || submission.clientId;
      const reqVendorId = submission.vendorId;

      if (!isAdmin) {
        if (orgId !== reqClientId && orgId !== reqVendorId) {
          console.warn(
            `[SECURITY] User ${userId} (${orgId}) attempted to create interview for submission ${subId} (Client: ${reqClientId}, Vendor: ${reqVendorId})`,
          );
          return res
            .status(403)
            .json({ error: "Access Denied: Organization Mismatch" });
        }
      }

      console.log("ROOM CREATE");
      // 1. Create Handle Deal Room
      let roomId = `DR-${subId}`;
      const drRef = adminDb.collection("dealRooms").doc(roomId);
      const drSnap = await drRef.get();
      if (!drSnap.exists) {
        await drRef.set({
          id: roomId,
          submissionId: subId,
          requirementId: requirement.id || "",
          candidateId: submission.candidateId || "",
          vendorId: submission.vendorId || "Unknown",
          clientId: requirement.clientId || submission.clientId || "",
          participants: [
            requirement.clientId || submission.clientId,
            submission.vendorId,
          ],
          clientName: requirement.clientName || "Client",
          vendorName: submission.vendorName || "Vendor",
          candidateName: submission.candidateName || "Anonymous",
          jobTitle: requirement.title || "Strategic Role",
          experience: requirement.experience || "Not Specified",
          status: "ACTIVE",
          identitiesRevealed: false,
          createdAt: new Date(),
          matchData: { matchScore: submission.matchScore || 0 },
        });
      }

      const targetStatus = isClientAction
        ? "INTERVIEW_REQUESTED"
        : "INTERVIEW_SCHEDULED";

      console.log("SUBMISSION UPDATE", subId);
      // 2. Update Submission Status
      await adminDb.collection("submissions").doc(subId).update({
        dealRoomId: roomId,
        status: targetStatus,
        updatedAt: new Date(),
      });

      console.log("INTERVIEW CREATE (INITIAL STATE: DRAFT)");
      // 3. Create Interview Record linked to submission in DRAFT status
      const interviewId = adminDb.collection("interviews").doc().id;
      
      let meetingLink = formData.meetingLink || null;
      let calendarEventId = null;
      let meetingProvider = formData.mode === "Google Meet" ? "GOOGLE_MEET" : (formData.mode ? "MANUAL" : "NONE");

      await adminDb.collection("interviews").doc(interviewId).set({
        interviewId,
        submissionId: subId,
        candidateId: submission.candidateId || "",
        candidateName: submission.candidateName || "Anonymous",
        requirementId: requirement.id || "",
        dealRoomId: roomId || "",
        vendorId: submission.vendorId || "",
        clientId: requirement.clientId || submission.clientId || "",
        round: formData.round || null,
        date: formData.date || null,
        time: formData.time || "",
        startTime: formData.time ? `${formData.date}T${formData.time}` : null,
        endTime: formData.endTime
          ? `${formData.date}T${formData.endTime}`
          : null,
        timezone: formData.timezone || null,
        calendarProvider: formData.mode || null,
        meetingLink,
        calendarEventId,
        meetingProvider,
        interviewer: formData.interviewer || null,
        interviewerEmail: formData.interviewerEmail || null,
        mode: formData.mode || null,
        notes: formData.notes || null,
        status: "DRAFT",
        createdBy: userId || "unknown",
        createdByRole: role || "unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // If scheduled as Google Meet, trigger orchestration service
      if (!isClientAction && formData.mode === "Google Meet") {
        try {
          const event: CalendarEvent = {
            summary: `Interview: ${submission.candidateName || 'Candidate'} - ${requirement.title || 'Role'}`,
            description: formData.notes || `Interview round: ${formData.round || 'Technical'}. Panel: ${formData.interviewer || 'Interviewer'}.`,
            start: {
              dateTime: `${formData.date}T${formData.time}:00`,
              timeZone: formData.timezone || "UTC",
            },
            end: {
              dateTime: formData.endTime ? `${formData.date}T${formData.endTime}:00` : `${formData.date}T${formData.time}:00`,
              timeZone: formData.timezone || "UTC",
            },
            attendees: [
              ...(formData.interviewerEmail ? [{ email: formData.interviewerEmail }] : []),
              ...(submission.candidateEmail ? [{ email: submission.candidateEmail }] : []),
            ],
          };

          const scheduled = await InterviewOrchestrationService.scheduleAIInterview(
            userId || "",
            interviewId,
            event,
            true
          );

          meetingLink = scheduled.meetingLink || null;
          calendarEventId = scheduled.calendarEventId || null;
          meetingProvider = scheduled.meetingProvider || "GOOGLE_MEET";
        } catch (err: any) {
          console.error("[InterviewsHandler] Google Meet scheduling failed:", err.message);
          // Delete draft to prevent orphaned dirty data
          await adminDb.collection("interviews").doc(interviewId).delete();
          return res.status(400).json({
            success: false,
            error: err.message || "Google Calendar connection is required to schedule Google Meet. Please connect Google Workspace in Settings -> Integrations."
          });
        }
      } else {
        // Not Google Meet, transition manually from DRAFT to standard SCHEDULED / REQUESTED
        await adminDb.collection("interviews").doc(interviewId).update({
          status: isClientAction ? "REQUESTED" : "SCHEDULED",
          updatedAt: new Date().toISOString()
        });
      }

      console.log("MESSAGE CREATE");
      // 4. Add system message to Deal Room
      await adminDb
          .collection("dealRooms")
          .doc(roomId)
          .collection("messages")
          .add({
            senderRole: "System",
            senderId: "system",
            type: "system",
            text: isClientAction
              ? `📅 INTERVIEW REQUESTED: ${formData.round} preferred on ${formData.date}. Panel: ${formData.interviewer}. Waiting for vendor availability.`
              : `📅 INTERVIEW SCHEDULED: ${formData.round} on ${formData.date} at ${formData.time} ${formData.timezone || 'UTC'}. Mode: ${formData.mode}. Panel: ${formData.interviewer}.`,
            timestamp: new Date(),
          });

      console.log("NOTIFICATION CREATE");
      // 5. Send notifications
      const notifBase = {
        title: isClientAction ? "Interview Requested" : "Interview Scheduled",
        message: `${formData.round} for ${submission.candidateName} on ${formData.date}`,
        type: "INTERVIEW",
        createdAt: new Date(),
        read: false,
      };

      if (requirement.clientId) {
        await adminDb.collection("notifications").add({
          ...notifBase,
          recipientId: requirement.clientId,
          actionUrl: `/deal-rooms?view=interviews`,
        });
      }
      if (submission.vendorId || submission.vendorOrgId) {
        await adminDb.collection("notifications").add({
          ...notifBase,
          recipientId: submission.vendorId || submission.vendorOrgId,
          actionUrl: `/deal-rooms?view=interviews`,
        });
      }

      return res
        .status(200)
        .json({ success: true, interviewId });
    } catch (err: any) {
      console.error("INTERVIEW_CREATE_ERROR", err);
      return res.status(500).json({
        success: false,
        error: String(err),
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const { interviewId, formData } = req.body;
      if (!interviewId || !formData) {
        return res.status(400).json({ success: false, error: "Missing interviewId or formData parameters." });
      }

      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      console.log("[InterviewsHandler] Rescheduling interview:", interviewId);

      // Check if current interview exists
      const interviewRef = adminDb.collection("interviews").doc(interviewId);
      const doc = await interviewRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: "Interview not found." });
      }
      const interviewData = doc.data() as any;

      const subDoc = await adminDb.collection("submissions").doc(interviewData.submissionId).get();
      const submission = subDoc.exists ? subDoc.data() : {};
      const reqDoc = await adminDb.collection("requirements").doc(interviewData.requirementId).get();
      const requirement = reqDoc.exists ? reqDoc.data() : {};

      const event: CalendarEvent = {
        summary: `Rescheduled Interview: ${interviewData.candidateName || 'Candidate'} - ${requirement?.title || 'Role'}`,
        description: formData.notes || `Interview round: ${formData.round || 'Technical'}. Panel: ${formData.interviewer || 'Interviewer'}.`,
        start: {
          dateTime: `${formData.date}T${formData.time}:00`,
          timeZone: formData.timezone || "UTC",
        },
        end: {
          dateTime: formData.endTime ? `${formData.date}T${formData.endTime}:00` : `${formData.date}T${formData.time}:00`,
          timeZone: formData.timezone || "UTC",
        },
        attendees: [
          ...(formData.interviewerEmail ? [{ email: formData.interviewerEmail }] : []),
          ...(submission?.candidateEmail ? [{ email: submission.candidateEmail }] : []),
        ],
      };

      const createMeet = formData.mode === "Google Meet";
      
      await InterviewOrchestrationService.rescheduleInterview(
        userId,
        interviewId,
        event,
        createMeet
      );

      // Also update the human schedule details in Firestore record
      await interviewRef.update({
        round: formData.round || interviewData.round,
        date: formData.date || interviewData.date,
        time: formData.time || interviewData.time,
        startTime: formData.time ? `${formData.date}T${formData.time}` : interviewData.startTime,
        endTime: formData.endTime ? `${formData.date}T${formData.endTime}` : interviewData.endTime,
        timezone: formData.timezone || interviewData.timezone,
        interviewer: formData.interviewer || interviewData.interviewer,
        interviewerEmail: formData.interviewerEmail || interviewData.interviewerEmail || null,
        mode: formData.mode || interviewData.mode,
        notes: formData.notes || interviewData.notes,
        calendarProvider: formData.mode || interviewData.calendarProvider,
        updatedAt: new Date().toISOString()
      });

      // Add a system message in the deal room
      if (interviewData.dealRoomId) {
        await adminDb
          .collection("dealRooms")
          .doc(interviewData.dealRoomId)
          .collection("messages")
          .add({
            senderRole: "System",
            senderId: "system",
            type: "system",
            text: `🔄 INTERVIEW RESCHEDULED: ${formData.round || interviewData.round} on ${formData.date} at ${formData.time} ${formData.timezone || 'UTC'}. Mode: ${formData.mode || interviewData.mode}. Panel: ${formData.interviewer || interviewData.interviewer}.`,
            timestamp: new Date(),
          });
      }

      return res.status(200).json({ success: true, interviewId });
    } catch (err: any) {
      console.error("[InterviewsHandler] PUT error:", err);
      return res.status(err.code === "CALENDAR_CONNECTION_REQUIRED" ? 400 : 500).json({
        success: false,
        error: err.message || "Failed to reschedule interview."
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const interviewId = req.query.id as string || req.body.interviewId;
      const reason = req.query.reason as string || req.body.reason || "Cancelled by recruiter.";

      if (!interviewId) {
        return res.status(400).json({ success: false, error: "Missing interviewId parameter." });
      }

      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      console.log("[InterviewsHandler] Cancelling interview:", interviewId);

      const interviewRef = adminDb.collection("interviews").doc(interviewId);
      const doc = await interviewRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: "Interview not found." });
      }
      const interviewData = doc.data() as any;

      // Call orchestration cancellation
      await InterviewOrchestrationService.cancelInterview(userId, interviewId, reason);

      // Add system message to Deal Room
      if (interviewData.dealRoomId) {
        await adminDb
          .collection("dealRooms")
          .doc(interviewData.dealRoomId)
          .collection("messages")
          .add({
            senderRole: "System",
            senderId: "system",
            type: "system",
            text: `🚫 INTERVIEW CANCELLED: Round ${interviewData.round} has been cancelled. Reason: ${reason}`,
            timestamp: new Date(),
          });
      }

      return res.status(200).json({ success: true, message: "Interview cancelled successfully." });
    } catch (err: any) {
      console.error("[InterviewsHandler] DELETE error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to cancel interview." });
    }
  }

  // Ensure default return is JSON
  return res.status(405).json({ success: false, error: "Method not allowed" });
}
