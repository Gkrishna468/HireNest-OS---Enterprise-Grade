const fs = require('fs');
const content = fs.readFileSync('src/api-lib/services/MailOSService.ts', 'utf8');

const startStr = '// 1. Resolve or Create Canonical Conversation Thread (Refinement 1)';
const endStr = "processed.push({ type: 'RECEIVED', id: msg.id, subject, summary: 'Ingested raw email successfully.' });";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr) + endStr.length;

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find start or end index");
    process.exit(1);
}

const replacement = `// Pass to Universal Intake Platform
                const rawPayload = {
                    id: msg.id,
                    tenantId: orgId,
                    correlationId: \`corr-\${msg.id}\`,
                    channel: "email",
                    sender: from,
                    subject: subject,
                    body: body,
                    attachments: attachments,
                    receivedAt: date || new Date().toISOString(),
                    metadata: { gmailThreadId, msgId: msg.id }
                };

                // Save basic Mail Message for idempotency
                await db.collection('mail_messages').doc(msg.id).set({
                    gmailMessageId: msg.id,
                    workspaceId: orgId,
                    status: 'PROCESSED_BY_INTAKE',
                    createdAt: new Date()
                });

                // Process via Intake Engine asynchronously to not block sync
                IntakeEngine.process(rawPayload, "gmail").catch(e => {
                    console.error(\`[MailOS] IntakeEngine processing failed for \${msg.id}:\`, e);
                });

                processed.push({ type: 'RECEIVED', id: msg.id, subject, summary: 'Sent to Universal Intake Engine.' });`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/api-lib/services/MailOSService.ts', newContent);
console.log("Patched successfully");
