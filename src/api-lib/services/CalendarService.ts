import { google } from 'googleapis';
import { db } from '../../lib/firebase-admin.js';
import { encryptText, decryptText } from '../../lib/encryption.js';

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
}

export class CalendarService {
  
  private static async getClientForUser(uid: string) {
    if (!db) throw new Error("Database not initialized");
    
    const doc = await db.collection("token_vault").doc(uid).get();
    if (!doc.exists) throw new Error("No OAuth connection found for user.");

    const data = doc.data();
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
      access_token: data?.accessToken ? decryptText(data.accessToken) : null,
      refresh_token: data?.refreshToken ? decryptText(data.refreshToken) : null,
      expiry_date: data?.expiryDate,
    });

    // Handle auto-refresh updates
    client.on("tokens", async (tokens) => {
      const updateData: any = {};
      if (tokens.access_token) updateData.accessToken = encryptText(tokens.access_token);
      if (tokens.refresh_token) updateData.refreshToken = encryptText(tokens.refresh_token);
      if (tokens.expiry_date) updateData.expiryDate = tokens.expiry_date;

      await db.collection("token_vault").doc(uid).set(updateData, { merge: true });
    });

    return client;
  }

  /**
   * List upcoming events for a user
   */
  static async listEvents(uid: string, timeMin: string = new Date().toISOString()) {
    const client = await this.getClientForUser(uid);
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  }

  /**
   * Check if user has an active Google OAuth connection
   */
  static async hasOAuthConnection(uid: string): Promise<boolean> {
    if (!db) return false;
    try {
      const doc = await db.collection("token_vault").doc(uid).get();
      return doc.exists;
    } catch (e) {
      console.error("[CalendarService] hasOAuthConnection check failed:", e);
      return false;
    }
  }

  /**
   * Check free/busy availability
   */
  static async getFreeBusy(uid: string, timeMin: string, timeMax: string, items: string[] = ['primary']) {
    const isConnected = await this.hasOAuthConnection(uid);
    if (!isConnected) {
      const err: any = new Error("Google Calendar is not connected. Connect Google Workspace in Settings -> Integrations before checking availability.");
      err.code = "GOOGLE_CALENDAR_NOT_CONNECTED";
      throw err;
    }

    try {
      const client = await this.getClientForUser(uid);
      const calendar = google.calendar({ version: 'v3', auth: client });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          items: items.map(id => ({ id })),
        }
      });

      return response.data.calendars || {};
    } catch (error: any) {
      console.error("[CalendarService] getFreeBusy error:", error.message);
      if (error.message?.includes("invalid_grant") || error.message?.includes("OAuth") || error.message?.includes("token")) {
        const err: any = new Error("Google OAuth connection has expired. Please reconnect in Settings -> Integrations.");
        err.code = "GOOGLE_OAUTH_EXPIRED";
        throw err;
      }
      const err: any = new Error(error.message || "Failed to query Google Calendar availability.");
      err.code = "GOOGLE_CALENDAR_ERROR";
      throw err;
    }
  }

  /**
   * Create a new interview/event
   */
  static async createEvent(uid: string, event: CalendarEvent, createMeet: boolean = false) {
    const isConnected = await this.hasOAuthConnection(uid);
    if (!isConnected) {
      const err: any = new Error("Google Calendar is not connected. Connect Google Workspace in Settings -> Integrations before scheduling.");
      err.code = "GOOGLE_CALENDAR_NOT_CONNECTED";
      throw err;
    }

    try {
      const client = await this.getClientForUser(uid);
      const calendar = google.calendar({ version: 'v3', auth: client });

      const requestBody: any = { ...event };
      if (createMeet) {
        requestBody.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet"
            }
          }
        };
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody,
        sendUpdates: 'all', // Send invites to attendees
        conferenceDataVersion: createMeet ? 1 : undefined,
      });

      return response.data;
    } catch (error: any) {
      console.error("[CalendarService] createEvent error:", error.message);
      if (error.message?.includes("invalid_grant") || error.message?.includes("OAuth") || error.message?.includes("token")) {
        const err: any = new Error("Google OAuth connection has expired. Please reconnect in Settings -> Integrations.");
        err.code = "GOOGLE_OAUTH_EXPIRED";
        throw err;
      }
      const err: any = new Error(error.message || "Failed to create Google Calendar event.");
      err.code = "GOOGLE_CALENDAR_ERROR";
      throw err;
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(uid: string, eventId: string) {
    const isConnected = await this.hasOAuthConnection(uid);
    if (!isConnected) return; // Silent skip on disconnect

    try {
      const client = await this.getClientForUser(uid);
      const calendar = google.calendar({ version: 'v3', auth: client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
    } catch (error: any) {
      console.error("[CalendarService] deleteEvent error:", error.message);
    }
  }
}
