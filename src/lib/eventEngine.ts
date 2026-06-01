import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface NotificationEvent {
  type: "info" | "warning" | "success" | "urgent";
  title: string;
  message: string;
  actionUrl?: string;
  recipients: string[]; // specific uid, orgId, or "GLOBAL_ADMIN", "GLOBAL_CLIENT", "GLOBAL_VENDOR"
}

export async function publishEvent(event: NotificationEvent) {
  try {
    const promises = event.recipients.map((recipientId) =>
      addDoc(collection(db, "notifications"), {
        title: event.title,
        message: event.message,
        type: event.type,
        actionUrl: event.actionUrl || "",
        recipientId: recipientId,
        read: false,
        createdAt: serverTimestamp(),
      }),
    );
    await Promise.all(promises);
    console.log(`[EVENT ENGINE] Published event: ${event.title}`);
  } catch (err) {
    console.warn("Error publishing event:", err);
  }
}
