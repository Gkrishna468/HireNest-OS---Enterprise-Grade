import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
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

      // 1. Create Handle Deal Room
      let roomId = submission.dealRoomId;
      if (!roomId) {
         roomId = "DR-" + Math.random().toString(36).substr(2, 9);
         await adminDb.collection("dealRooms").doc(roomId).set({
           id: roomId,
           requirementId: requirement.id,
           candidateId: submission.candidateId,
           vendorId: submission.vendorId,
           clientId: requirement.clientId,
           clientName: requirement.clientName || 'Client',
           vendorName: submission.vendorName || 'Vendor',
           candidateName: submission.candidateName || 'Anonymous',
           jobTitle: requirement.title || "Strategic Role",
           experience: requirement.experience || "Not Specified",
           status: "ACTIVE",
           currentStage: formData.round,
           identitiesRevealed: false,
           createdAt: new Date(),
           matchData: { matchScore: submission.matchScore || 0 }
         });
      }

      const targetStatus = isClientAction ? 'INTERVIEW_REQUESTED' : 'INTERVIEW_SCHEDULED';
      const subId = submission.submissionId || submission.id;

      // 2. Update Submission Status
      await adminDb.collection("submissions").doc(subId).update({
        dealRoomId: roomId,
        status: targetStatus,
        updatedAt: new Date()
      });

      // 3. Create Interview Record linked to submission
      const interviewRef = await adminDb.collection("interviews").add({
        submissionId: subId,
        candidateId: submission.candidateId,
        candidateName: submission.candidateName || 'Anonymous',
        requirementId: requirement.id,
        dealRoomId: roomId,
        vendorId: submission.vendorId || '',
        clientId: requirement.clientId || '',
        round: formData.round,
        date: formData.date,
        time: formData.time || '',
        startTime: formData.time ? `${formData.date}T${formData.time}` : null,
        endTime: formData.endTime ? `${formData.date}T${formData.endTime}` : null,
        timezone: formData.timezone,
        calendarProvider: formData.mode,
        meetingLink: formData.meetingLink,
        interviewer: formData.interviewer,
        mode: formData.mode,
        notes: formData.notes,
        status: isClientAction ? "REQUESTED" : "SCHEDULED",
        createdAt: new Date()
      });

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

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message || "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
