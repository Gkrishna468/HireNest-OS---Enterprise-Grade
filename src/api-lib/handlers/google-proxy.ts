import express from 'express';
import { db } from '../../lib/firebase-admin.js';
import { google } from 'googleapis';
import { encryptText, decryptText } from '../../lib/encryption.js';

const googleProxyHandler = express.Router();

async function getClientForUser(uid: string) {
   const doc = await db.collection('token_vault').doc(uid).get();
   if (!doc.exists) throw new Error("No OAuth connection found for user.");
   
   const data = doc.data();
   const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID",
      process.env.GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET"
   );
   
   client.setCredentials({
      access_token: data?.accessToken ? decryptText(data.accessToken) : null,
      refresh_token: data?.refreshToken ? decryptText(data.refreshToken) : null,
      expiry_date: data?.expiryDate
   });

   // Handle auto-refresh updates
   client.on('tokens', async (tokens) => {
      const updateData: any = {};
      if (tokens.access_token) updateData.accessToken = encryptText(tokens.access_token);
      if (tokens.refresh_token) updateData.refreshToken = encryptText(tokens.refresh_token);     
      if (tokens.expiry_date) updateData.expiryDate = tokens.expiry_date;
      
      await db.collection('token_vault').doc(uid).set(updateData, { merge: true });
   });

   return client;
}

googleProxyHandler.get('/gmail/messages', async (req, res) => {
   const uid = (req as any).user?.uid;
   const orgId = (req as any).user?.orgId || (req as any).query?.orgId;

   if (!uid) return res.status(401).json({ error: "Unauthorized" });
   
   try {
       let query = db.collection('mail_messages');
       if (orgId) {
           query = query.where('workspaceId', '==', orgId);
       }
       const snapshot = await query.orderBy('createdAt', 'desc').limit(25).get();
       
       const fullMessages = snapshot.docs.map(doc => {
           const d = doc.data();
           return {
               id: d.gmailMessageId,
               snippet: d.rawPayload?.snippet,
               subject: d.rawPayload?.subject || '(No Subject)',
               from: d.rawPayload?.from || '(Unknown Sender)',
               classification: { type: d.entityType }
           };
       });
       
       res.json({ messages: fullMessages });
   } catch (e: any) {
       console.error(e);
       res.status(500).json({ error: e.message || "Failed to fetch Gmail from MailOS" });
   }
});

googleProxyHandler.get('/calendar/events', async (req, res) => {
   const uid = (req as any).user?.uid;
   if (!uid) return res.status(401).json({ error: "Unauthorized" });
   const timeMin = req.query.timeMin as string || (new Date()).toISOString();

   try {
      const client = await getClientForUser(uid);
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=10&singleEvents=true&orderBy=startTime`;
      const response = await client.request({ url });
      
      res.json(response.data);
   } catch (e: any) {
      console.error(e);
      res.status(e.response?.status || 500).json({ error: e.message || "Failed to fetch Calendar" });
   }
});

googleProxyHandler.post('/calendar/events', async (req, res) => {
   const uid = (req as any).user?.uid;
   if (!uid) return res.status(401).json({ error: "Unauthorized" });

   try {
      const client = await getClientForUser(uid);
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
      
      const response = await client.request({ 
         url, 
         method: 'POST',
         data: req.body 
      });
      
      res.json(response.data);
   } catch (e: any) {
      console.error(e);
      res.status(e.response?.status || 500).json({ error: e.message || "Failed to create Calendar Event" });
   }
});

export default googleProxyHandler;
