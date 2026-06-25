import express from 'express';
import { db } from '../../lib/firebase-admin';
import { createOAuthClient } from './oauth';
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

      const userClient = createOAuthClient();
      userClient.setCredentials({
          access_token: data.accessToken,
          refresh_token: data.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: userClient });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Ensure calendar is responsive
      const calendar = google.calendar({ version: 'v3', auth: userClient });
      const calendars = await calendar.calendarList.list({ maxResults: 1 });

      let watchStatus = false;
      let watchError = null;
      let watchExpiration: number | null = null;
      let watchHistoryId: string | null = null;
      let watchData: any = null;

      const watchDoc = await db.collection('gmail_watch').doc(uid).get();
      if (watchDoc.exists) {
          watchData = watchDoc.data();
          // Renew watch if it expires in less than 24 hours
          if (watchData && watchData.expiration > (Date.now() + 24 * 60 * 60 * 1000)) {
              watchStatus = true;
              watchExpiration = watchData.expiration;
              watchHistoryId = watchData.historyId;
          }
      }

      if (!watchStatus) {
         const pubsub = new (require('@google-cloud/pubsub').PubSub)();
         const pubsubTopicName = process.env.PUBSUB_TOPIC_NAME || 'gmail-events';
         const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
         const fullyQualifiedTopicName = `projects/${projectId}/topics/${pubsubTopicName}`;
         
         try {
            const topic = pubsub.topic(pubsubTopicName);
            const [exists] = await topic.exists();
            if (!exists) {
               await pubsub.createTopic(pubsubTopicName);
               console.log(`[PubSub] Topic ${pubsubTopicName} created.`);
               
               const iam = topic.iam;
               const [policy] = await iam.getPolicy();
               policy.bindings = policy.bindings || [];
               policy.bindings.push({
                  role: 'roles/pubsub.publisher',
                  members: ['serviceAccount:gmail-api-push@system.gserviceaccount.com']
               });
               await iam.setPolicy(policy);
               console.log(`[PubSub] Granted publisher role to Gmail API.`);
            }
         } catch (pubsubErr: any) {
            console.error("[PubSub] Failed to ensure topic exists:", pubsubErr.message);
         }

         try {
             console.log("WATCH TOPIC =", fullyQualifiedTopicName);
             const watchRes = await gmail.users.watch({
                 userId: "me",
                 requestBody: {
                     topicName: fullyQualifiedTopicName,
                     labelIds: ["INBOX"],
                     labelFilterBehavior: "INCLUDE"
                 }
             });
             if (watchRes.data.historyId && watchRes.data.expiration) {
                 watchExpiration = Number(watchRes.data.expiration);
                 watchHistoryId = watchRes.data.historyId;
                 await db.collection('gmail_watch').doc(uid).set({
                     historyId: watchHistoryId,
                     expiration: watchExpiration,
                     updatedAt: Date.now()
                 }, { merge: true });
                 watchStatus = true;
             }
         } catch (watchErr: any) {
             console.error("========== GMAIL WATCH FAILED ==========");
             console.error("MESSAGE:", watchErr.message);
             console.error("CODE:", watchErr.code);

             if (watchErr.response?.data) {
                 console.error(
                     JSON.stringify(watchErr.response.data, null, 2)
                 );
             }

             console.error(watchErr.stack);

             watchStatus = false;
             watchError = watchErr.response?.data || watchErr.message;
         }
      }

      let watchRemainingHours = 0;
      if (watchExpiration) {
          watchRemainingHours = Math.max(0, Math.floor((watchExpiration - Date.now()) / (1000 * 60 * 60)));
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
         watchError,
         watchExpiration: watchExpiration ? new Date(watchExpiration).toISOString() : null,
         watchRemainingHours,
         watchHistoryId,
         scopes: data.scope,
         lastRefresh: data.updatedAt || new Date(),
         mailSync: {
             lastHistoryId: watchData?.lastHistoryId || watchHistoryId || null,
             lastPubSubMessage: watchData?.lastPubSubMessage || null,
             lastSync: watchData?.lastSync || null,
             status: watchStatus ? "healthy" : "error"
         }
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
