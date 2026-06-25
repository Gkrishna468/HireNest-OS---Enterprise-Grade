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

        const tokenDoc = await db.collection('token_vault').doc(uid).get();
        if (!tokenDoc.exists) throw new Error("No Google workspace connection found");

        const data = tokenDoc.data();
        if (!data?.accessToken) throw new Error("No access token found");

        const accessToken = decryptText(data.accessToken);
        const refreshToken = data.refreshToken ? decryptText(data.refreshToken) : undefined;

        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: data.expiryDate
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

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
            
            let body = '';
            let attachments: any[] = [];

            const processParts = (parts: any[]) => {
                for (const part of parts) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
                    } else if (part.filename && part.body?.attachmentId) {
                        attachments.push({
                            filename: part.filename,
                            mimeType: part.mimeType,
                            attachmentId: part.body.attachmentId
                        });
                    }
                    if (part.parts) {
                        processParts(part.parts);
                    }
                }
            };
            
            if (msgData.data.payload?.parts) {
                processParts(msgData.data.payload.parts);
            } else if (msgData.data.payload?.body?.data) {
                body = Buffer.from(msgData.data.payload.body.data, 'base64').toString('utf-8');
            }

            if (!body && attachments.length === 0) continue;

            const classification = await this.classifyEmail(subject, body, from);
            const executionLog: any = {
                agentName: 'Mail Sync Agent',
                agentType: 'MAILOS',
                createdAt: new Date(),
                status: 'success',
                task: `Processed email from ${from}`,
                duration: 0, // Placeholder
            };
            const startTime = Date.now();

            if (classification.type === 'REQUIREMENT') {
                const reqId = await this.createRequirement(classification.data, orgId, uid, from);
                processed.push({ type: 'REQUIREMENT', id: reqId, subject, summary: classification.summary });
                executionLog.agentName = 'Requirement Extraction Agent';
                executionLog.task = `Extracted requirement from ${from}`;
            } else if (classification.type === 'RESUME') {
                executionLog.agentName = 'Resume Parser';
                executionLog.task = `Parsed resume from ${from}`;
                // Process resume attachments
                for (const att of attachments) {
                    if (att.mimeType === 'application/pdf' || att.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                        const attData = await gmail.users.messages.attachments.get({
                            userId: 'me',
                            messageId: msg.id,
                            id: att.attachmentId
                        });
                        
                        if (attData.data.data) {
                            const parsedCandidate = await this.parseResumeAttachment(attData.data.data, att.mimeType, subject, body);
                            if (parsedCandidate) {
                                const candId = await this.createCandidate(parsedCandidate, orgId, uid, from);
                                processed.push({ type: 'RESUME', id: candId, subject, summary: `Processed resume: ${att.filename}` });
                            }
                        }
                    }
                }
                if (processed.length === 0 || !processed.find(p => p.type === 'RESUME')) {
                    processed.push({ type: 'RESUME_NO_ATTACHMENT', subject });
                }
            } else {
                processed.push({ type: classification.type || 'IGNORED', subject, summary: classification.summary });
            }

            executionLog.duration = Date.now() - startTime;
            await db.collection('agent_executions').add(executionLog);

            // Remove UNREAD label to mark as processed
            await gmail.users.messages.modify({
                userId: 'me',
                id: msg.id,
                requestBody: { removeLabelIds: ['UNREAD'] }
            });
        }

        return processed;
    }

    private static async classifyEmail(subject: string, body: string, from: string) {
        const prompt = `
        Analyze this email for an IT staffing agency. 
        Determine if it is:
        - REQUIREMENT (client looking for talent/sharing a JD)
        - RESUME (candidate or vendor submitting a resume)
        - VENDOR_RESPONSE (vendor replying to a requirement broadcast)
        - INTERVIEW (interview scheduled/confirmed)
        - OFFER (job offer details)
        - INVOICE (invoice for payment)
        - OTHER (general conversation, spam, marketing)
        
        Extract relevant data based on the type.

        Respond ONLY with a valid JSON object matching this schema:
        {
          "type": "REQUIREMENT" | "RESUME" | "VENDOR_RESPONSE" | "INTERVIEW" | "OFFER" | "INVOICE" | "OTHER",
          "data": {
            // Include keys relevant to the type (e.g. title, skills, budget, location for REQUIREMENT)
          },
          "confidence": number (0-100),
          "summary": string (1 sentence summary)
        }

        From: ${from}
        Subject: ${subject}
        Body: ${body.substring(0, 3000)}
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            return JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("Gemini classification failed", e);
            return { type: "OTHER", summary: "Failed to classify" };
        }
    }
    
    private static async parseResumeAttachment(base64Data: string, mimeType: string, subject: string, body: string) {
        const prompt = `
        You are an expert technical recruiter AI. Extract the candidate's profile from the attached resume document.
        Return ONLY a JSON object matching this schema:
        {
            "firstName": string,
            "lastName": string,
            "email": string,
            "phone": string,
            "location": string,
            "skills": string[],
            "experienceYears": number,
            "summary": string
        }
        Context email subject: ${subject}
        Context email body: ${body.substring(0, 1000)}
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    prompt,
                    { inlineData: { data: base64Data, mimeType: mimeType } }
                ],
                config: { responseMimeType: 'application/json' }
            });
            return JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("Gemini resume parsing failed", e);
            return null;
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
            financials: { clientBudget: data.budget || '' }
        });
        return docRef.id;
    }
    
    private static async createCandidate(data: any, orgId: string, createdBy: string, from: string) {
        const docRef = db.collection('candidatePool').doc();
        await docRef.set({
            id: docRef.id,
            orgId: orgId,
            firstName: data.firstName || 'Unknown',
            lastName: data.lastName || 'Candidate',
            email: data.email || from,
            phone: data.phone || '',
            location: data.location || '',
            skills: data.skills || [],
            experienceYears: data.experienceYears || 0,
            summary: data.summary || '',
            status: 'AVAILABLE',
            source: 'GMAIL_RESUME_PARSER',
            sourceEmail: from,
            createdAt: new Date().toISOString(),
            createdBy: createdBy,
        });
        return docRef.id;
    }
}
