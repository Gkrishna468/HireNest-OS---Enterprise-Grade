import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { dealRoomId, fromEmail, vendorId, subject, text, role } = payload;

    if (!dealRoomId) {
      return NextResponse.json({ error: "Missing dealRoomId" }, { status: 400 });
    }

    if (!db) {
       return NextResponse.json({ error: "Admin DB not initialized" }, { status: 500 });
    }

    // In a real email receiving hook, we'd find the dealRoomId based on email threads or alias parsing.
    // For now we accept the ID.

    const messagePayload = {
      type: "email",
      senderRole: role || "System",
      senderId: vendorId || "SystemEmailHook",
      subject: subject || "No Subject",
      text: text || "",
      fromEmail: fromEmail || "global_admin@hirenestworkforce.com",
      timestamp: new Date() // Since it's admin SDK, we'd use Firestore.FieldValue.serverTimestamp(), but Date() is ok.
    };

    // Store in dealRooms subcollection
    const docRef = await db.collection("dealRooms").doc(dealRoomId).collection("messages").add(messagePayload);

    return NextResponse.json({ success: true, messageId: docRef.id });
  } catch (err: any) {
    console.error("Ingest Email Webhook Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
