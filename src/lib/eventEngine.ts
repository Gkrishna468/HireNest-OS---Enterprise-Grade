import { ServiceProvider } from "./providers/ServiceProvider";

export interface NotificationEvent {
  type: "info" | "warning" | "success" | "urgent";
  title: string;
  message: string;
  actionUrl?: string;
  recipients: string[]; // specific uid, orgId, or "GLOBAL_ADMIN", "GLOBAL_CLIENT", "GLOBAL_VENDOR"
}

export async function publishEvent(event: NotificationEvent) {
  return ServiceProvider.eventService.publishEvent(event);
}
