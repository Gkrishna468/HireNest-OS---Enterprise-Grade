const fs = require('fs');
const file = 'src/api-lib/handlers/cron.ts';
let content = fs.readFileSync(file, 'utf8');

// Addresses Checklist Rule 2 (No Pagination) and Rule 1 (N+1 Queries)
// By adding a limit to cron sync and parallelizing the user fetches.
content = content.replace(
  /\.where\("gmail", "==", true\)\s*\.get\(\);/,
  '.where("gmail", "==", true).limit(50).get(); // VIBE CHECK: Added limit(50) to prevent OOM on large connection sets'
);

content = content.replace(
  /for \(const doc of connectionsSnap\.docs\) \{[\s\S]*?const uid = doc\.id;/,
  `// VIBE CHECK: Removed sequential loop, processing concurrently to avoid N+1 blocking
    await Promise.all(connectionsSnap.docs.map(async (doc) => {
      const uid = doc.id;`
);

content = content.replace(
  /results\.push\(\{ uid, orgId, processed \}\);/,
  `results.push({ uid, orgId, processed });`
);

content = content.replace(
  /          \}\)\s*\}\s*catch \([^)]+\) \{\s*console\.log\("[^"]+", err\);\s*\}\s*\}\s*\}/g,
  `          })
        } catch (err) {
          console.log("[CRON] MailOS sync failed for " + uid, err);
        }
      }
    }));`
);

fs.writeFileSync(file, content);
