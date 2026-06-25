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

            const classification = await this.classifyEmail(subject, body, from, attachments);
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

    private static async classifyEmail(subject: string, body: string, from: string, attachments: any[] = []) {
        const attachmentNames = attachments.map(a => a.filename).join(', ');
        const prompt = `
        Analyze this email for an IT staffing agency. 
        Determine if it is:
        - REQUIREMENT (client looking for talent/sharing a JD)
        - RESUME (candidate or vendor submitting a resume/profile)
        - VENDOR_RESPONSE (vendor replying to a requirement broadcast)
        - INTERVIEW (interview scheduled/confirmed)
        - OFFER (job offer details)
        - INVOICE (invoice for payment)
        - OTHER (general conversation, spam, marketing)
        
        Extract relevant structured data based on the type (e.g. candidate details, skills, experience, location, budget).
        
        Provide suggested actions for the recruiter to take next (e.g., "Create Candidate", "Run Match Engine", "Submit to Requirement").
        
        Provide a detailed timeline of events that occurred and should occur for this email in a staffing workflow context.

        Respond ONLY with a valid JSON object matching this schema:
        {
          "type": "REQUIREMENT" | "RESUME" | "VENDOR_RESPONSE" | "INTERVIEW" | "OFFER" | "INVOICE" | "OTHER",
          "data": {
            // Detailed extracted entities as key-value pairs (e.g., "Candidate Name": "Deepesh", "Experience": "9 Years")
            // Keys should be human-readable strings, values should be strings or arrays of strings.
          },
          "confidence": number (0-100),
          "confidenceReason": "string (bullet point style explanation of why this confidence level was chosen based on email content and attachments)",
          "summary": "string (a concise, professional AI summary of the email's impact/purpose)",
          "suggestedActions": ["string", "string"],
          "timeline": [
              { "time": "string (e.g., 09:12 AM)", "title": "string (e.g., Email Received)" },
              { "time": "string", "title": "string" }
          ]
        }

        From: ${from}
        Subject: ${subject}
        Attachments: ${attachmentNames}
        Body: ${body.substring(0, 3000)}
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            return JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("Gemini classification failed", e);
            return { type: "OTHER", summary: "Failed to classify", confidence: 0, confidenceReason: "Error during processing." };
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

    static async analyzeMessage(uid: string, orgId: string, messageId: string) {
        if (!db) throw new Error("Database not initialized");

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
        
        const msgData = await gmail.users.messages.get({
            userId: 'me',
            id: messageId
        });

        const headers = msgData.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || '';
        const from = headers?.find(h => h.name === 'From')?.value || '';
        const to = headers?.find(h => h.name === 'To')?.value || '';
        const date = headers?.find(h => h.name === 'Date')?.value || '';
        
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

        const classification = await this.classifyEmail(subject, body, from, attachments);
        
        let matchingJobs = [];
        let estimatedRevenue = 0;
        if (classification.type === 'RESUME' || classification.type === 'CANDIDATE') {
            try {
                // Fetch active requirements to match against
                const reqsSnap = await db.collection('requirements_public').where('status', '==', 'OPEN').limit(10).get();
                const reqs = reqsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Do a quick heuristic match based on extracted skills if available
                const candSkills = Array.isArray(classification.data?.skills) 
                    ? classification.data.skills.map((s: string) => s.toLowerCase()) 
                    : [];
                
                reqs.forEach((req: any) => {
                    const reqSkills = Array.isArray(req.skills) ? req.skills.map((s: string) => s.toLowerCase()) : [];
                    let score = 50; // Base score
                    let matchedCount = 0;
                    reqSkills.forEach((rs: string) => {
                        if (candSkills.some(cs => cs.includes(rs) || rs.includes(cs))) {
                            score += 15;
                            matchedCount++;
                        }
                    });
                    
                    if (matchedCount > 0 || reqSkills.length === 0) {
                        score = Math.min(score, 98);
                        const fee = req.financials?.clientBudget ? parseInt(req.financials.clientBudget.toString().replace(/\D/g, '')) * 0.15 : 15000;
                        matchingJobs.push({
                            id: req.id,
                            title: req.title,
                            client: req.clientId || 'Unknown Client',
                            score: score,
                            fee: fee,
                            location: req.location || 'Remote'
                        });
                        estimatedRevenue += fee;
                    }
                });
                
                // Sort by score
                matchingJobs.sort((a, b) => b.score - a.score);
                matchingJobs = matchingJobs.slice(0, 5); // top 5
            } catch(e) {
                console.error("Failed to fetch matching jobs", e);
            }
        }
        
        return {
            id: messageId,
            subject,
            from,
            to,
            date,
            bodySnippet: body.substring(0, 500),
            classification,
            attachments: attachments.map(a => a.filename),
            businessImpact: {
                matchingJobs,
                estimatedRevenue,
                priority: matchingJobs.length > 0 ? 'High' : 'Normal',
                owner: 'System AI',
                automationReady: true
            }
        };
    }
}
