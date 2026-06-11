import express from 'express';
import { db } from '../../lib/firebase-admin.js';
import { OAuth2Client } from 'google-auth-library';
import { oauth2Client } from './oauth.js';

const googleProxyHandler = express.Router();

async function getClientForUser(uid: string) {
   const doc = await db.collection('token_vault').doc(uid).get();
   if (!doc.exists) throw new Error("No OAuth connection found for user.");
   
   const data = doc.data();
   const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID",
      process.env.GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET"
   );
   
   client.setCredentials({
      access_token: data?.accessToken,
      refresh_token: data?.refreshToken,
      expiry_date: data?.expiryDate
   });

   // Handle auto-refresh updates
   client.on('tokens', async (tokens) => {
      const updateData: any = {};
      if (tokens.access_token) updateData.accessToken = tokens.access_token;
      if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;     
      if (tokens.expiry_date) updateData.expiryDate = tokens.expiry_date;
      
      await db.collection('token_vault').doc(uid).set(updateData, { merge: true });
   });

   return client;
}

googleProxyHandler.get('/gmail/messages', async (req, res) => {
   const uid = (req as any).user?.uid;
   if (!uid) return res.status(401).json({ error: "Unauthorized" });

   try {
      const client = await getClientForUser(uid);
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15`;
      const response = await client.request({ url });
      
      const data: any = response.data;
      if (data.messages && data.messages.length > 0) {
         const fullMessages = await Promise.all(data.messages.map(async (msg: any) => {
            const dResp = await client.request({ 
               url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From` 
            });
            const detailData: any = dResp.data;
            const subjectHeader = detailData.payload?.headers?.find((h: any) => h.name === 'Subject');
            const fromHeader = detailData.payload?.headers?.find((h: any) => h.name === 'From');
            return {
               id: msg.id,
               snippet: detailData.snippet,
               subject: subjectHeader?.value || '(No Subject)',
               from: fromHeader?.value || '(Unknown Sender)'
            };
         }));
         res.json({ messages: fullMessages });
      } else {
         res.json({ messages: [] });
      }
   } catch (e: any) {
      console.error(e);
      res.status(e.response?.status || 500).json({ error: e.message || "Failed to fetch Gmail" });
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
