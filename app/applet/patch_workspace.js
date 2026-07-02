const fs = require('fs');
let code = fs.readFileSync('src/api-lib/handlers/workspace.ts', 'utf8');

const webhookCode = `
workspaceHandler.post("/gmail/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.data) {
      return res.status(400).send("Bad Request");
    }

    const dataBuffer = Buffer.from(message.data, 'base64');
    const dataJson = JSON.parse(dataBuffer.toString('utf-8'));
    const emailAddress = dataJson.emailAddress;

    if (!emailAddress) {
      return res.status(400).send("Missing emailAddress");
    }

    if (!db) {
      return res.status(500).send("DB not connected");
    }

    const snapshot = await db.collection("workspace_connections")
      .where("emailAddress", "==", emailAddress)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn("[Gmail Webhook] No user found for email:", emailAddress);
      return res.status(200).send("OK");
    }

    const uid = snapshot.docs[0].id;
    const userDoc = await db.collection("users").doc(uid).get();
    let orgId = "default";
    if (userDoc.exists) {
      orgId = userDoc.data()?.orgId || "default";
    }

    console.log(\`[Gmail Webhook] Triggering syncInbox for \${emailAddress} (uid: \${uid}, orgId: \${orgId})\`);

    MailOSService.syncInbox(uid, orgId).then(() => {
      console.log(\`[Gmail Webhook] syncInbox completed for \${emailAddress}\`);
    }).catch(err => {
      console.error(\`[Gmail Webhook] syncInbox failed for \${emailAddress}:\`, err);
    });

    res.status(200).send("OK");
  } catch (err: any) {
    console.error("[Gmail Webhook] Error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});
`;

if (!code.includes('/gmail/webhook')) {
  code = code.replace('export default workspaceHandler;', webhookCode + '\nexport default workspaceHandler;');
  fs.writeFileSync('src/api-lib/handlers/workspace.ts', code, 'utf8');
  console.log('Added Gmail webhook to workspace.ts');
} else {
  console.log('Gmail webhook already exists');
}
