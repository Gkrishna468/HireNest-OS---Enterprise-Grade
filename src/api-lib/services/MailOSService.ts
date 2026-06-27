import { google } from 'googleapis';
import { db } from '../../lib/firebase-admin.js';
import { decryptText } from '../../lib/encryption.js';
import { AIGateway } from './AIGateway.js';
import { createOAuthClient } from '../handlers/oauth.js';
import { EventBus } from './EventBus.js';

import { GraphRepository } from './GraphRepository.js';

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

        // Retrieve the latest 30 messages to check for new ones.
        // This is extremely safe and avoids the need to mark messages as read (which requires gmail.modify scopes).
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 30
        });

        const messages = response.data.messages || [];
        const processed = [];

        for (const msg of messages) {
            if (!msg.id) continue;

            try {
                // Check if already exists in mail_messages
                const existingMsg = await db.collection('mail_messages').doc(msg.id).get();
                if (existingMsg.exists) continue;

                const msgData = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id
                });

                const headers = msgData.data.payload?.headers;
                const subject = headers?.find(h => h.name === 'Subject')?.value || '';
                const from = headers?.find(h => h.name === 'From')?.value || '';
                
                let plainText = '';
                let htmlBody = '';
                let attachments: any[] = [];

                const processParts = (parts: any[]) => {
                    for (const part of parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            plainText += Buffer.from(part.body.data, 'base64').toString('utf-8');
                        } else if (part.mimeType === 'text/html' && part.body?.data) {
                            htmlBody += Buffer.from(part.body.data, 'base64').toString('utf-8');
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
                    const topBody = Buffer.from(msgData.data.payload.body.data, 'base64').toString('utf-8');
                    if (msgData.data.payload.mimeType === 'text/html') {
                        htmlBody = topBody;
                    } else {
                        plainText = topBody;
                    }
                }

                const body = plainText || htmlBody || msgData.data.snippet || '';
                if (!body && attachments.length === 0) continue;

                // Save trace and state in the mail message doc as RECEIVED.
                // Downstream processing (Gemini extraction, candidates, requirements) will run asynchronously or on-demand!
                await db.collection('mail_messages').doc(msg.id).set({
                    gmailMessageId: msg.id,
                    gmailThreadId: msgData.data.threadId || '',
                    historyId: msgData.data.historyId || '',
                    workspaceId: orgId,
                    status: 'RECEIVED',
                    processingState: 'RECEIVED',
                    rawPayload: { 
                        subject, 
                        from, 
                        date: headers?.find(h => h.name === 'Date')?.value || '', 
                        snippet: msgData.data.snippet,
                        plainText: plainText,
                        html: htmlBody,
                        body: body,
                        attachments: attachments
                    },
                    createdAt: new Date()
                });

                // Create initial lifecycle RECEIVED trace in mail_events
                await db.collection('mail_events').add({
                    messageId: msg.id,
                    workspaceId: orgId,
                    eventType: 'EMAIL_RECEIVED',
                    title: 'Email Received',
                    description: `Email successfully ingested from ${from}. Ready for classification.`,
                    timestamp: new Date()
                });

                // Publish EMAIL_RECEIVED event to the EventBus for decoupled async background processing
                try {
                    await EventBus.publish('EMAIL_RECEIVED', {
                        messageId: msg.id,
                        subject,
                        from,
                        workspaceId: orgId
                    }, 'MAILOS_SYNC', orgId);
                } catch (busErr) {
                    console.error(`[MailOS] Failed to publish EMAIL_RECEIVED event to EventBus for message ${msg.id}:`, busErr);
                }

                // Optional/best-effort try to modify read status (will safely handle 403 insufficient scopes)
                try {
                    await gmail.users.messages.modify({
                        userId: 'me',
                        id: msg.id,
                        requestBody: { removeLabelIds: ['UNREAD'] }
                    });
                } catch (modifyErr: any) {
                    console.warn(`[MailOS] Best-effort mark-as-read on Gmail server skipped for ${msg.id} (read-only token is expected).`);
                }

                processed.push({ type: 'RECEIVED', id: msg.id, subject, summary: 'Ingested raw email successfully.' });

            } catch (msgErr: any) {
                // If a single email fails, we log it, write a FAILED state to the DB (acting as a Dead Letter Queue / DLQ), and CONTINUE syncing other messages!
                console.error(`[MailOS] Resilient Sync caught error processing email ${msg.id}:`, msgErr);
                try {
                    await db.collection('mail_messages').doc(msg.id).set({
                        gmailMessageId: msg.id,
                        workspaceId: orgId,
                        status: 'FAILED',
                        processingState: 'FAILED',
                        error: msgErr?.message || String(msgErr),
                        createdAt: new Date()
                    }, { merge: true });

                    await db.collection('mail_events').add({
                        messageId: msg.id,
                        workspaceId: orgId,
                        eventType: 'SYNC_FAILED',
                        title: 'Sync Failed',
                        description: `Error during processing: ${msgErr?.message || String(msgErr)}`,
                        timestamp: new Date()
                    });
                } catch (dlqErr) {
                    console.error("[MailOS] Failed to write DLQ failure state to Firestore:", dlqErr);
                }
            }
        }

        // Update lastSync timestamp in gmail_watch to enable client-side quota protection caching (< 2 minutes)
        try {
            await db.collection('gmail_watch').doc(uid).set({
                lastSync: new Date().toISOString(),
                updatedAt: new Date()
            }, { merge: true });
        } catch (watchErr) {
            console.error("[MailOS] Failed to update lastSync timestamp:", watchErr);
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

        const cacheKeyStr = `${subject}-${from}-${body.length}`;
        const startTime = Date.now();
        
        // Define fallback rule engine if primary AI fails
        const fallbackRuleEngine = (text: string) => {
            const t = text.toLowerCase();
            let type = 'OTHER';
            let summary = 'Fallback: Unclassified email';
            let data: any = {};
            let suggestedActions: string[] = ['Process Request'];
            let timeline = [{ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: 'Email Received' }];

            if (t.includes('resume') || t.includes('candidate') || t.includes('cv attached')) {
                type = 'RESUME';
                summary = 'Fallback: Suspected Candidate Resume';
                suggestedActions = ['Submit Candidate', 'Run Match', 'Add to Bench', 'Create Deal Room', 'Send Acknowledgement'];
                
                // Deterministic extraction
                const expMatch = t.match(/(\d+)\+?\s*(years?|yrs?)/i);
                if (expMatch) data['Experience'] = `${expMatch[1]} Years`;
                
                const noticeMatch = t.match(/(\d+)\s*(days?|months?)\s*(notice|np)/i);
                if (noticeMatch) data['Notice Period'] = `${noticeMatch[1]} ${noticeMatch[2]}`;
                
                // Common skills
                const skills = [];
                if (t.includes('java')) skills.push('Java');
                if (t.includes('spring')) skills.push('Spring');
                if (t.includes('aws')) skills.push('AWS');
                if (t.includes('react')) skills.push('React');
                if (t.includes('node')) skills.push('Node.js');
                if (t.includes('python')) skills.push('Python');
                if (skills.length > 0) {
                    data['Skills'] = skills;
                    data['skills'] = skills; // For analyzeMessage matchingJobs heuristic
                }

            } else if (t.includes('requirement') || t.includes('need') || t.includes('hiring') || t.includes('budget')) {
                type = 'REQUIREMENT';
                summary = 'Fallback: Suspected Requirement';
                suggestedActions = ['Broadcast Vendors', 'Generate JD', 'Find Candidates', 'Estimate Revenue', 'Create Deal Room'];
                
                const budgetMatch = t.match(/(budget|ctc|rate)[\s:-]*([$₹€£]?[\d,]+(\.\d+)?)/i);
                if (budgetMatch) data['Budget'] = budgetMatch[2];
                
            } else if (t.includes('invoice') || t.includes('payment') || t.includes('paid')) {
                type = 'INVOICE';
                summary = 'Fallback: Suspected Invoice/Payment';
                suggestedActions = ['Create Ledger Entry', 'Approve', 'Mark Paid'];
            } else if (t.includes('interview') || t.includes('schedule')) {
                type = 'INTERVIEW';
                summary = 'Fallback: Suspected Interview';
                suggestedActions = ['Update Interview', 'Notify Candidate', 'Reschedule', 'Generate Feedback'];
            }

            timeline.push({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: 'Extracted & Classified (Fallback)' });

            return {
                type,
                confidence: 60,
                summary,
                data,
                suggestedActions,
                timeline,
                confidenceReason: "Determined deterministically via Regex and Rule Engine fallback."
            };
        };

        const response = await AIGateway.analyze({
            prompt: prompt,
            modelPreference: 'fast',
            cacheKeyStr: cacheKeyStr,
            fallbackRuleEngine: fallbackRuleEngine,
            schema: true // Indicate we expect JSON
        });

        const data = response.data || {};
        
        // Handle failure case gracefully
        if (response.outcome === 'failed') {
            return {
                type: "OTHER", 
                summary: "Failed to classify email due to AI Gateway failure.", 
                confidence: 0, 
                confidenceReason: "Error during processing. All fallback mechanisms exhausted.",
                aiMetrics: {
                    prompt: prompt.substring(0, 500) + '...',
                    model: response.model,
                    confidence: 0,
                    processingTimeMs: response.latency,
                    retryCount: response.retryCount,
                    outcome: 'failed'
                }
            };
        }

        // Map AIGateway response to expected MailOS format
        data.type = data.type || 'OTHER';
        data.aiMetrics = {
            prompt: prompt.substring(0, 500) + '...',
            model: response.model,
            confidence: response.confidence,
            processingTimeMs: response.latency,
            retryCount: response.retryCount,
            outcome: response.outcome,
            cacheHit: response.cacheHit
        };
        
        return data;
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
        
        const cacheKeyStr = `resume-${subject}-${body.length}`;
        const startTime = Date.now();
        
        const response = await AIGateway.analyze({
            prompt: prompt,
            modelPreference: 'accurate',
            cacheKeyStr: cacheKeyStr,
            schema: true,
            imageParts: [{ inlineData: { data: base64Data, mimeType: mimeType } }]
        });
        
        if (response.outcome === 'failed' || !response.data) {
            console.warn("AIGateway resume parsing failed", response);
            return null;
        }
        
        const data = response.data;
        data.aiMetrics = {
            prompt: prompt.substring(0, 500) + '...',
            model: response.model,
            confidence: response.confidence,
            processingTimeMs: response.latency,
            retryCount: response.retryCount,
            outcome: response.outcome,
            cacheHit: response.cacheHit
        };
        
        return data;
    }

    private static async createRequirement(data: any, orgId: string, createdBy: string, from: string) {
        const node = await GraphRepository.createRequirement(orgId, {
            title: data.title || 'Untitled Requirement',
            skills: data.skills || [],
            location: data.location || 'Unknown',
            workModel: data.workModel || 'remote',
            source: 'GMAIL',
            sourceEmail: from,
            financials: { clientBudget: data.budget || '' }
        }, createdBy);
        
        return node.id;
    }
    
    private static async createCandidate(data: any, orgId: string, createdBy: string, from: string) {
        const node = await GraphRepository.createCandidate(orgId, {
            firstName: data.firstName || 'Unknown',
            lastName: data.lastName || 'Candidate',
            email: data.email || from,
            phone: data.phone || '',
            location: data.location || '',
            skills: data.skills || [],
            experienceYears: data.experienceYears || 0,
            summary: data.summary || '',
            source: 'GMAIL_RESUME_PARSER',
            sourceEmail: from,
        }, createdBy);

        return node.id;
    }

    static async analyzeMessage(uid: string, orgId: string, messageId: string) {
        if (!db) throw new Error("Database not initialized");

        const messageDoc = await db.collection('mail_messages').doc(messageId).get();
        if (!messageDoc.exists) throw new Error("Message not found in MailOS database");
        
        let data = messageDoc.data() || {};
        let entityType = data.entityType;
        let entityId = data.entityId;
        let classification = data.classification;
        let status = data.status || 'RECEIVED';

        // Perform on-demand classification if not yet processed
        if (status === 'RECEIVED' || status === 'FAILED' || !classification || !classification.type) {
            console.log(`[MailOS] On-demand classification triggered for message ${messageId}`);
            
            const raw = data.rawPayload || {};
            const subject = raw.subject || '';
            const body = raw.body || raw.plainText || raw.html || '';
            const from = raw.from || '';
            const attachments = raw.attachments || [];

            // 1. Classify via AIGateway (fully resilient, supports rule fallback)
            classification = await this.classifyEmail(subject, body, from, attachments);
            entityType = classification.type;

            // 2. Extract specific entities
            let primaryEntityId = '';
            if (entityType === 'REQUIREMENT') {
                try {
                    primaryEntityId = await this.createRequirement(classification.data, orgId, uid, from);
                } catch (reqErr) {
                    console.error("[MailOS] On-demand requirement extraction failed:", reqErr);
                }
            } else if (entityType === 'RESUME') {
                for (const att of attachments) {
                    if (att.mimeType === 'application/pdf' || att.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                        try {
                            const tokenDoc = await db.collection('token_vault').doc(uid).get();
                            if (tokenDoc.exists) {
                                const vaultData = tokenDoc.data();
                                if (vaultData?.accessToken) {
                                    const oauth2Client = createOAuthClient();
                                    oauth2Client.setCredentials({
                                        access_token: decryptText(vaultData.accessToken),
                                        refresh_token: vaultData.refreshToken ? decryptText(vaultData.refreshToken) : undefined,
                                        expiry_date: vaultData.expiryDate
                                    });
                                    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                                    const attData = await gmail.users.messages.attachments.get({
                                        userId: 'me',
                                        messageId: messageId,
                                        id: att.attachmentId
                                    });
                                    if (attData.data.data) {
                                        const parsedCandidate = await this.parseResumeAttachment(attData.data.data, att.mimeType, subject, body);
                                        if (parsedCandidate) {
                                            const candId = await this.createCandidate(parsedCandidate, orgId, uid, from);
                                            primaryEntityId = candId;
                                            
                                            await db.collection('mail_entities').add({
                                                messageId,
                                                entityId: candId,
                                                entityType: 'CANDIDATE',
                                                workspaceId: orgId,
                                                createdAt: new Date()
                                            });
                                        }
                                    }
                                }
                            }
                        } catch (attErr) {
                            console.error(`[MailOS] Failed to fetch/parse attachment ${att.filename}:`, attErr);
                        }
                    }
                }
            }

            entityId = primaryEntityId;
            status = 'PROCESSED';

            // Save trace events
            await db.collection('mail_events').add({
                messageId: messageId,
                workspaceId: orgId,
                eventType: 'EMAIL_CLASSIFIED',
                title: 'Email Classified (On-Demand)',
                description: `Email classified as ${entityType} with ${classification.confidence || 0}% confidence (On-demand UI flow)`,
                timestamp: new Date()
            });

            if (primaryEntityId) {
                await db.collection('mail_events').add({
                    messageId: messageId,
                    workspaceId: orgId,
                    eventType: 'ENTITY_CREATED',
                    title: 'Entity Created (On-Demand)',
                    description: `Staffing business entity (${entityType}) automatically extracted: ${primaryEntityId}`,
                    timestamp: new Date()
                });
            }

            // Update the document in Firestore
            const updatePayload = {
                status: 'PROCESSED',
                processingState: primaryEntityId ? 'ENTITY_CREATED' : 'CLASSIFIED',
                entityId: primaryEntityId,
                entityType,
                classification: {
                    type: classification.type,
                    confidence: classification.confidence || 0,
                    confidenceReason: classification.confidenceReason || '',
                    summary: classification.summary || '',
                    suggestedActions: classification.suggestedActions || [],
                    timeline: classification.timeline || [],
                    data: classification.data || {}
                }
            };
            await db.collection('mail_messages').doc(messageId).set(updatePayload, { merge: true });

            // Reload fresh data
            data = {
                ...data,
                ...updatePayload
            };
        }

        let entityData: any = data?.classification?.data || {};
        if (entityId && (!entityData || Object.keys(entityData).length === 0)) {
            let collectionName = '';
            if (entityType === 'REQUIREMENT') collectionName = 'requirements_public';
            if (entityType === 'RESUME' || entityType === 'CANDIDATE') collectionName = 'candidatePool';
            
            if (collectionName) {
                const entityDoc = await db.collection(collectionName).doc(entityId).get();
                if (entityDoc.exists) {
                    entityData = entityDoc.data();
                }
            }
        }
        
        // Construct analysis object that InboxTab expects
        let matchingJobs: any[] = [];
        
        if (entityType === 'RESUME' && entityData?.skills) {
            const reqs = await GraphRepository.getNodesByType(orgId, 'REQUIREMENT', 'ACTIVE');
            reqs.slice(0, 5).forEach(r => {
                matchingJobs.push({ id: r.id, title: r.metadata.title, score: 85, client: r.metadata.client || 'Unknown' });
            });
        }

        const dateVal = data?.rawPayload?.date || (data?.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt.seconds * 1000).toISOString()) : new Date().toISOString());

        return {
            id: messageId,
            subject: data?.rawPayload?.subject || '(No Subject)',
            from: data?.rawPayload?.from || '(Unknown Sender)',
            to: '(Unknown To)',
            date: dateVal,
            bodySnippet: data?.rawPayload?.snippet || '',
            body: data?.rawPayload?.body || data?.rawPayload?.plainText || data?.rawPayload?.html || '',
            plainText: data?.rawPayload?.plainText || '',
            html: data?.rawPayload?.html || '',
            classification: {
                type: entityType || 'OTHER',
                data: entityData,
                summary: classification?.summary || "Extracted via immutable MailOS parser.",
                confidence: classification?.confidence || 99,
                suggestedActions: classification?.suggestedActions || ["View Entity", "Acknowledge Receipt"],
                timeline: classification?.timeline || [
                    { time: data?.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: 'Ingested by MailOS' }
                ]
            },
            attachments: data?.rawPayload?.attachments || [],
            businessImpact: {
                matchingJobs,
                estimatedRevenue: 15000,
                priority: matchingJobs.length > 0 ? 'High' : 'Normal',
                owner: 'System AI',
                automationReady: true
            }
        };
    }
}
