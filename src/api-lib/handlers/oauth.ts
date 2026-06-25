import { db } from '../../lib/firebase-admin.js';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import express from 'express';
import { observabilityService } from '../services/ObservabilityService.js';

// Use environment variables or rely on user metadata logic if missing
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/oauth/callback";

export const createOAuthClient = () => new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
export const oauth2Client = createOAuthClient();

const oauthHandler = express.Router();

oauthHandler.get('/url', (req, res) => {
   const { uid, redirectTo } = req.query;
   if (!uid) return res.status(400).json({ error: "Missing uid parameter" });

   const url = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     prompt: 'consent',
     scope: [
       'https://www.googleapis.com/auth/userinfo.email',
       'https://www.googleapis.com/auth/gmail.readonly',
       'https://www.googleapis.com/auth/calendar'
     ],
     state: JSON.stringify({ uid, redirectTo: redirectTo || '/app' })
   });

   res.json({ url });
});

oauthHandler.get('/callback', async (req, res) => {
   console.log("STEP 1 callback reached");
   const code = req.query.code as string;
   const stateStr = req.query.state as string;

   if (!code || !stateStr) {
      return res.status(400).send("Missing code or state");
   }

   try {
      console.log("STEP 2 parsing state");
      const state = JSON.parse(stateStr);
      
      console.log("STEP 3 exchanging token");
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log("STEP 4 token received");
      const userClient = createOAuthClient();
      userClient.setCredentials(tokens);

      if (!db) {
         console.error("[OAuth] Firebase adminDb is null. Cannot store token. Check FIREBASE_PRIVATE_KEY env vars.");
         return res.status(500).send("Database not configured. Check backend environment variables.");
      }

      console.log("STEP 5 firestore write");
      // Store in backend vault securely
      try {
         await db.collection('token_vault').doc(state.uid).set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || null,
            expiryDate: tokens.expiry_date,
            scope: tokens.scope,
            updatedAt: new Date()
         }, { merge: true });
      } catch (dbErr: any) {
         if (dbErr.message && dbErr.message.includes("UNAUTHENTICATED")) {
            console.error("[OAuth] FATAL: Cannot store token. Firebase Admin SDK lacks credentials.");
            console.error("[OAuth] FIX: You MUST set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in your environment variables (e.g. Vercel Settings) to write to the token_vault.");
            return res.status(500).send("Firebase Admin SDK is not configured with a Service Account. OAuth token cannot be securely stored. Please configure FIREBASE_PRIVATE_KEY.");
         }
         throw dbErr;
      }

      console.log("STEP 5.1 Verification");
      try {
          const pubsub = new (require('@google-cloud/pubsub').PubSub)();
          const topicName = 'gmail-events';
          try {
             const topic = pubsub.topic(topicName);
             const [exists] = await topic.exists();
             if (!exists) {
                await pubsub.createTopic(topicName);
                console.log(`[PubSub] Topic ${topicName} created.`);
                
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

          const gmail = google.gmail({ version: 'v1', auth: userClient });
          const profile = await gmail.users.getProfile({ userId: 'me' });

          const calendar = google.calendar({ version: 'v3', auth: userClient });
          const calendars = await calendar.calendarList.list({ maxResults: 1 });

          let watchStatus = false;
          try {
             const watchRes = await gmail.users.watch({
                 userId: "me",
                 requestBody: {
                     topicName: "projects/hirenest-os/topics/gmail-events"
                 }
             });
             if (watchRes.data.historyId && watchRes.data.expiration) {
                 await db.collection('gmail_watch').doc(state.uid).set({
                     historyId: watchRes.data.historyId,
                     expiration: Number(watchRes.data.expiration),
                     updatedAt: Date.now()
                 });
                 watchStatus = true;
             }
          } catch (watchErr: any) {
             console.error("[OAuth] Failed to register Gmail watch:", watchErr.message);
          }

          console.log("STEP 5.2 Update SSOT");
          await db.collection('workspace_connections').doc(state.uid).set({
             provider: "google",
             connected: true,
             gmail: true,
             calendar: !!calendars.data.items,
             emailAddress: profile.data.emailAddress,
             watchStatus,
             lastVerified: new Date(),
             updatedAt: new Date()
          }, { merge: true });

      } catch (verifyErr: any) {
          console.error("[OAuth] Workspace verification failed during callback:", verifyErr.message);
          await db.collection('workspace_connections').doc(state.uid).set({
              connected: false,
              error: verifyErr.message
          }, { merge: true });
      }

      observabilityService.logOAuthEvent({
         provider: "google",
         status: "success",
         severity: "INFO",
         actorId: state.uid,
         metadata: { scope: tokens.scope }
      }).catch(console.error);

      console.log("STEP 6 redirect");
      // Redirect back to application
      res.redirect(state.redirectTo);

   } catch (err: any) {
      console.error("FULL OAUTH ERROR", err);
      console.error("STACK", err?.stack);
      console.error("OAuth callback error:", err);
      observabilityService.logOAuthEvent({
         provider: "google",
         status: "failure",
         severity: "ERROR",
         metadata: { error: err.message || String(err) }
      }).catch(console.error);

      res.status(500).send("OAuth Authorization Failed.");
   }
});

// Removed status endpoint from oauthHandler as it is now in workspaceHandler

oauthHandler.post('/disconnect', async (req, res) => {
   const uid = (req as any).user?.uid;
   if (!uid) return res.status(401).json({ error: "Unauthorized" });

   try {
      await db.collection('token_vault').doc(uid).delete();
      res.json({ success: true });
   } catch (e) {
      res.status(500).json({ error: "Server error" });
   }
});

export default oauthHandler;
