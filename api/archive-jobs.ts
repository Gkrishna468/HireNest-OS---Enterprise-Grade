import { adminDb } from "../src/lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security check for cron trigger
  const crontoken = req.headers['x-cron-token'];
  if (crontoken !== process.env.CRON_SECRET_TOKEN && process.env.NODE_ENV === 'production') {
     console.warn("Unauthorized attempt to trigger archival worker.");
     return res.status(401).json({ error: "Unauthorized" });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const RETENTION_DAYS = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffIso = cutoffDate.toISOString();

    const queueRef = adminDb.collection('ai_jobs');
    const archiveRef = adminDb.collection('ai_jobs_archive');
    
    // Batch query to find jobs older than 90 days that are in terminating states
    const snapshot = await queueRef
      .where('status', 'in', ['completed', 'failed'])
      .where('createdAt', '<', cutoffIso)
      .limit(500)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ status: 'ok', message: 'No old jobs to archive' });
    }

    const batchSize = 100; // Limit operations per commit
    let processed = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = adminDb.batch();
      const docsToProcess = snapshot.docs.slice(i, i + batchSize);
      
      docsToProcess.forEach(doc => {
        // 1. Write backup to archive collection
        const archiveDocRef = archiveRef.doc(doc.id);
        batch.set(archiveDocRef, { ...doc.data(), archivedAt: new Date().toISOString() });
        
        // 2. Delete from operational queue
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      processed += docsToProcess.length;
    }

    return res.status(200).json({ status: 'ok', archivedJobs: processed });
  } catch (err: any) {
    console.error("[DATA_RETENTION_ERROR]", err);
    return res.status(500).json({ error: 'Failed to archive data run' });
  }
}
