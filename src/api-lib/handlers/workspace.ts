import express from 'express';
import { db } from '../../lib/firebase-admin';
import { oauth2Client } from './oauth';
import { google } from 'googleapis';

const workspaceHandler = express.Router();

workspaceHandler.get('/status', async (req, res) => {
   const uid = (req as any).user?.uid;
   if (!uid) return res.status(401).json({ error: "Unauthorized" });

   if (!db) {
       return res.json({ connected: false, error: "Database not configured" });
   }

   try {
      const doc = await db.collection('token_vault').doc(uid).get();
      if (!doc.exists) {
          await db.collection('workspace_connections').doc(uid).set({ connected: false }, { merge: true });
          return res.json({ connected: false });
      }
      
      const data = doc.data();
      if (!data?.accessToken) {
          await db.collection('workspace_connections').doc(uid).set({ connected: false }, { merge: true });
          return res.json({ connected: false });
      }

      oauth2Client.setCredentials({
          access_token: data.accessToken,
          refresh_token: data.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Ensure calendar is responsive
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendars = await calendar.calendarList.list({ maxResults: 1 });

      let watchStatus = false;
      const watchDoc = await db.collection('gmail_watch').doc(uid).get();
      if (watchDoc.exists) {
          const watchData = watchDoc.data();
          if (watchData && watchData.expiration > Date.now()) {
              watchStatus = true;
          }
      }

      if (!watchStatus) {
         try {
             const watchRes = await gmail.users.watch({
                 userId: "me",
                 requestBody: {
                     topicName: "projects/hirenest-os/topics/gmail-events"
                 }
             });
             if (watchRes.data.historyId && watchRes.data.expiration) {
                 await db.collection('gmail_watch').doc(uid).set({
                     historyId: watchRes.data.historyId,
                     expiration: Number(watchRes.data.expiration),
                     updatedAt: Date.now()
                 });
                 watchStatus = true;
             }
         } catch (watchErr: any) {
             console.error("[Workspace] Failed to register Gmail watch:", watchErr.message);
         }
      }

      const connectionStatus = {
         connected: true,
         provider: "google",
         gmail: true,
         calendar: !!calendars.data.items,
         hasRefreshToken: !!data.refreshToken,
         emailAddress: profile.data.emailAddress,
         expiresAt: data.expiryDate,
         watchStatus,
         scopes: data.scope,
         lastRefresh: data.updatedAt || new Date()
      };

      // Store in SSOT WorkspaceConnectionService collection
      await db.collection('workspace_connections').doc(uid).set(connectionStatus, { merge: true });

      res.json(connectionStatus);
   } catch (e: any) {
      console.error("[Workspace Status] Error:", e.message || e);
      await db.collection('workspace_connections').doc(uid).set({ connected: false }, { merge: true });
      res.json({ connected: false, error: "Failed to verify tokens with Google APIs" });
   }
});

export default workspaceHandler;
