console.log("=== INTERVIEW START ===");
console.log("runtimeMode", runtimeMode);
console.log("adminDb", !!adminDb);
console.log("body", JSON.stringify(req.body));

import { adminDb, runtimeMode } from "../../lib/firebase-admin";

export default async function handler(req: any, res: any) {
  console.log("INTERVIEW HANDLER START");
  console.log("runtimeMode", runtimeMode);
  console.log("adminDb exists", !!adminDb);

  if (!adminDb) {
    console.error("INTERVIEWS_HANDLER_ADMIN_DB_NULL", runtimeMode);
    return res.status(503).json({
      success: false,
      error: "Admin Firestore unavailable",
      runtimeMode
    });
  }

  if (req.method === "GET") {
    const { candidateId, clientId, vendorId } = req.query;
    try {
      let q = adminDb.collection("interviews");
      if (candidateId) q = q.where("candidateId", "==", candidateId);
      if (clientId) q = q.where("clientId", "==", clientId);
      if (vendorId) q = q.where("vendorId", "==", vendorId);
      const snap = await q.get();
      const interviews = snap.docs.map((d: any) => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        };
      });
      return res.status(200).json({ interviews });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const {
        submission,
        requirement,
        isClientAction,
        formData
      } = req.body;

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
        isClientAction
      });

      const subId = submission?.submissionId || submission?.id || submission?.submissionRef || null;

      if (!subId) {
        console.error("Submission object received:", submission);
        return res.status(400).json({
           success:false,
           error:"Missing submissionId in interview request"
        });
      }

      console.log("ROOM CREATE");
      // 1. Create Handle Deal Room
      let roomId = submission.dealRoomId;
      if (!roomId) {
         roomId = "DR-" + Math.random().toString(36).substr(2, 9);
         await adminDb.collection("dealRooms").doc(roomId).set({
           id: roomId,
           requirementId: requirement.id || "",
           candidateId: submission.candidateId || "",
           vendorId: submission.vendorId || "Unknown",
           clientId: requirement.clientId || submission.clientId || "",
           clientName: requirement.clientName || 'Client',
           vendorName: submission.vendorName || 'Vendor',
           candidateName: submission.candidateName || 'Anonymous',
           jobTitle: requirement.title || "Strategic Role",
           experience: requirement.experience || "Not Specified",
           status: "ACTIVE",
           currentStage: formData.round || "interview",
           identitiesRevealed: false,
           createdAt: new Date(),
           matchData: { matchScore: submission.matchScore || 0 }
         });
      }

      const targetStatus = isClientAction ? 'INTERVIEW_REQUESTED' : 'INTERVIEW_SCHEDULED';

      console.log("SUBMISSION UPDATE", subId);
      // 2. Update Submission Status
      await adminDb.collection("submissions").doc(subId).update({
        dealRoomId: roomId,
        status: targetStatus,
        updatedAt: new Date()
      });

      console.log("INTERVIEW CREATE");
      // 3. Create Interview Record linked to submission
      const interviewRef = await adminDb.collection("interviews").add({
        submissionId: subId,
        candidateId: submission.candidateId || "",
        candidateName: submission.candidateName || 'Anonymous',
        requirementId: requirement.id || "",
        dealRoomId: roomId || "",
        vendorId: submission.vendorId || '',
        clientId: requirement.clientId || submission.clientId || '',
        round: formData.round || null,
        date: formData.date || null,
        time: formData.time || '',
        startTime: formData.time ? `${formData.date}T${formData.time}` : null,
        endTime: formData.endTime ? `${formData.date}T${formData.endTime}` : null,
        timezone: formData.timezone || null,
        calendarProvider: formData.mode || null,
        meetingLink: formData.meetingLink || null,
        interviewer: formData.interviewer || null,
        mode: formData.mode || null,
        notes: formData.notes || null,
        status: isClientAction ? "REQUESTED" : "SCHEDULED",
        createdAt: new Date()
      });

      console.log("MESSAGE CREATE");
      // 4. Add system message to Deal Room
      await adminDb.collection("dealRooms").doc(roomId).collection("messages").add({
         senderRole: "System",
         senderId: "system",
         type: "system",
         text: isClientAction 
            ? `📅 INTERVIEW REQUESTED: ${formData.round} preferred on ${formData.date}. Panel: ${formData.interviewer}. Waiting for vendor availability.`
            : `📅 INTERVIEW SCHEDULED: ${formData.round} on ${formData.date} at ${formData.time} ${formData.timezone}. Mode: ${formData.mode}. Interviewer: ${formData.interviewer}.`,
         timestamp: new Date()
      });

      console.log("NOTIFICATION CREATE");
      // 5. Send notifications
      const notifBase = {
        title: isClientAction ? "Interview Requested" : "Interview Scheduled",
        message: `${formData.round} for ${submission.candidateName} on ${formData.date}`,
        type: "INTERVIEW",
        createdAt: new Date(),
        read: false
      };
      
      if (requirement.clientId) {
         await adminDb.collection("notifications").add({
           ...notifBase, recipientId: requirement.clientId, actionUrl: `/deal-rooms?view=interviews`
         });
      }
      if (submission.vendorId || submission.vendorOrgId) {
         await adminDb.collection("notifications").add({
           ...notifBase, recipientId: submission.vendorId || submission.vendorOrgId, actionUrl: `/deal-rooms?view=interviews`
         });
      }

      return res.status(200).json({ success: true, interviewId: interviewRef.id });

    } catch (err: any) {
      console.error("INTERVIEW_CREATE_ERROR", err);
      return res.status(500).json({
         success: false,
         error: String(err)
      });
    }
  }

  // Ensure default return is JSON 
  return res.status(405).json({ success: false, error: "Method not allowed" });
}
