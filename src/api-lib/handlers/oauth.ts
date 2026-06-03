import { db } from '../../lib/firebase-admin';
import { OAuth2Client } from 'google-auth-library';
import express from 'express';

// Use environment variables or rely on user metadata logic if missing
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/oauth/google/callback";

export const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const oauthHandler = express.Router();

oauthHandler.get('/url', (req, res) => {
   const { uid, redirectTo } = req.query;
   if (!uid) return res.status(400).json({ error: "Missing uid parameter" });

   const url = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     prompt: 'consent',
     scope: [
       'https://www.googleapis.com/auth/gmail.readonly',
       'https://www.googleapis.com/auth/gmail.send',
       'https://www.googleapis.com/auth/calendar.events',
       'https://www.googleapis.com/auth/calendar.readonly',
       'https://www.googleapis.com/auth/userinfo.email'
     ],
     state: JSON.stringify({ uid, redirectTo: redirectTo || '/app' })
   });

   res.json({ url });
});

oauthHandler.get('/callback', async (req, res) => {
   const code = req.query.code as string;
   const stateStr = req.query.state as string;

   if (!code || !stateStr) {
      return res.status(400).send("Missing code or state");
   }

   try {
      const state = JSON.parse(stateStr);
      const { tokens } = await oauth2Client.getToken(code);
      
      oauth2Client.setCredentials(tokens);

      // Store in backend vault securely
      await db.collection('token_vault').doc(state.uid).set({
         accessToken: tokens.access_token,
         refreshToken: tokens.refresh_token,
         expiryDate: tokens.expiry_date,
         scope: tokens.scope,
         updatedAt: new Date()
      }, { merge: true });

      // Redirect back to application
      res.redirect(state.redirectTo);

   } catch (err: any) {
      console.error("OAuth callback error:", err);
      res.status(500).send("OAuth Authorization Failed.");
   }
});

oauthHandler.get('/status', async (req, res) => {
   // Validate firebase token via middleware 
   const uid = (req as any).user?.uid;
   if (!uid) return res.status(401).json({ error: "Unauthorized" });

   try {
      const doc = await db.collection('token_vault').doc(uid).get();
      if (!doc.exists) return res.json({ connected: false });
      
      const data = doc.data();
      res.json({ 
         connected: true, 
         hasRefreshToken: !!data?.refreshToken 
      });
   } catch (e) {
      res.status(500).json({ error: "Server error" });
   }
});

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
