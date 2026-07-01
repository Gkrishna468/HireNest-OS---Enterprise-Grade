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
   * Create a new interview/event
   */
  static async createEvent(uid: string, event: CalendarEvent) {
    const client = await this.getClientForUser(uid);
    const calendar = google.calendar({ version: 'v3', auth: client });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Send invites to attendees
    });

    return response.data;
  }

  /**
   * Delete an event
   */
  static async deleteEvent(uid: string, eventId: string) {
    const client = await this.getClientForUser(uid);
    const calendar = google.calendar({ version: 'v3', auth: client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }
}
