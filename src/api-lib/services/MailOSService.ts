import { google } from 'googleapis';
import { db } from '../../lib/firebase-admin.js';
import { decryptText } from '../../lib/encryption.js';
import { GoogleGenAI } from '@google/genai';
import { createOAuthClient } from '../handlers/oauth.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class MailOSService {
    static async syncInbox(uid: string, orgId: string) {
        if (!db) {
            throw new Error("Database not initialized");
        }

        // 1. Get credentials from vault
        const tokenDoc = await db.collection('token_vault').doc(uid).get();
        if (!tokenDoc.exists) {
            throw new Error("No Google workspace connection found");
        }

        const data = tokenDoc.data();
        if (!data?.accessToken) {
            throw new Error("No access token found");
        }

        const accessToken = decryptText(data.accessToken);
        const refreshToken = data.refreshToken ? decryptText(data.refreshToken) : undefined;

        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: data.expiryDate
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 2. Fetch unread messages
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread',
            maxResults: 10
        });

        const messages = response.data.messages || [];
        const processed = [];

        for (const msg of messages) {
            if (!msg.id) continue;

            const msgData = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id
            });

            const headers = msgData.data.payload?.headers;
            const subject = headers?.find(h => h.name === 'Subject')?.value || '';
            const from = headers?.find(h => h.name === 'From')?.value || '';
            
            // Basic body extraction
            let body = '';
            if (msgData.data.payload?.parts) {
                const part = msgData.data.payload.parts.find(p => p.mimeType === 'text/plain');
                if (part?.body?.data) {
                    body = Buffer.from(part.body.data, 'base64').toString();
                }
            } else if (msgData.data.payload?.body?.data) {
                body = Buffer.from(msgData.data.payload.body.data, 'base64').toString();
            }

            if (!body) continue;

            // 3. Classify and Extract using Gemini
            const classification = await this.classifyEmail(subject, body, from);

            if (classification.type === 'REQUIREMENT') {
                const reqId = await this.createRequirement(classification.data, orgId, uid, from);
                processed.push({ type: 'REQUIREMENT', id: reqId, subject });
            } else if (classification.type === 'RESUME') {
                // Future: Add to candidate pool
                processed.push({ type: 'RESUME', subject });
            } else {
                processed.push({ type: 'IGNORED', subject });
            }

            // Mark as read or label it to avoid reprocessing
            // await gmail.users.messages.modify({
            //     userId: 'me',
            //     id: msg.id,
            //     requestBody: { removeLabelIds: ['UNREAD'] }
            // });
        }

        return processed;
    }

    private static async classifyEmail(subject: string, body: string, from: string) {
        const prompt = `
        Analyze this email for a staffing agency. 
        Determine if it is a new job requirement (client looking for talent) or a candidate submission (vendor/candidate sending resume), or OTHER.
        
        If REQUIREMENT, extract: title, skills (array), location, budget (string), workModel (remote/hybrid/onsite), duration.
        If RESUME, extract: candidateName, skills.

        Respond ONLY with a valid JSON object matching this schema:
        {
          "type": "REQUIREMENT" | "RESUME" | "OTHER",
          "data": {
            // For REQUIREMENT
            "title": string,
            "skills": string[],
            "location": string,
            "budget": string,
            "workModel": string,
            
            // For RESUME
            "candidateName": string
          }
        }

        From: ${from}
        Subject: ${subject}
        Body: ${body.substring(0, 2000)}
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const text = response.text || "{}";
            return JSON.parse(text);
        } catch (e) {
            console.error("Gemini classification failed", e);
            return { type: "OTHER" };
        }
    }

    private static async createRequirement(data: any, orgId: string, createdBy: string, from: string) {
        const docRef = db.collection('requirements_public').doc();
        await docRef.set({
            id: docRef.id,
            orgId: orgId,
            title: data.title || 'Untitled Requirement',
            skills: data.skills || [],
            location: data.location || 'Unknown',
            workModel: data.workModel || 'remote',
            status: 'ACTIVE',
            source: 'GMAIL',
            sourceEmail: from,
            createdAt: new Date().toISOString(),
            createdBy: createdBy,
            financials: {
                clientBudget: data.budget || '',
            }
        });
        return docRef.id;
    }
}
