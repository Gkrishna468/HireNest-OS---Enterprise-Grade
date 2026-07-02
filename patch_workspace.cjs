const fs = require('fs');
const content = fs.readFileSync('src/api-lib/handlers/workspace.ts', 'utf8');

const analyzeStart = content.indexOf('workspaceHandler.post("/mailos/analyze/:messageId"');
const analyzeEnd = content.indexOf('});', analyzeStart) + 3;

if (analyzeStart === -1) {
    console.log("Could not find analyze endpoint");
    process.exit(1);
}

const replacement = `
workspaceHandler.get("/intake/metrics", async (req, res) => {
  try {
    const workspace = await WorkspaceResolver.resolve(req);
    const today = new Date().toISOString().split('T')[0];
    const doc = await db.collection("intake_metrics").doc(\`\${workspace.orgId}_\${today}\`).get();
    res.json({ success: true, metrics: doc.exists ? doc.data() : {} });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

workspaceHandler.get("/intake/review-queue", async (req, res) => {
  try {
    const workspace = await WorkspaceResolver.resolve(req);
    const snap = await db.collection("intake_review_queue")
        .where("tenantId", "==", workspace.orgId)
        .where("status", "==", "PENDING_REVIEW")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
    const queue = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, queue });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

workspaceHandler.get("/intake/audit", async (req, res) => {
  try {
    const workspace = await WorkspaceResolver.resolve(req);
    const snap = await db.collection("intake_audit")
        .where("tenantId", "==", workspace.orgId)
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();
    const audit = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, audit });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
`;

const newContent = content.substring(0, analyzeStart) + replacement + content.substring(analyzeEnd);
fs.writeFileSync('src/api-lib/handlers/workspace.ts', newContent);
console.log("Patched workspace.ts");
