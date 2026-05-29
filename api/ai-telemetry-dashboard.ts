import { adminDb } from "../src/lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure caller has admin privileges (in real app, check custom claims)
  const orgId = req.headers['x-org-id'];
  if (!orgId) {
    return res.status(400).json({ error: "Missing x-org-id header" });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // 1. Fetch AI Usage Logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    const usageSnapshot = await adminDb.collection("ai_usage_logs")
      .where("orgId", "==", orgId)
      .where("timestamp", ">=", thirtyDaysAgoIso)
      .get();

    let totalTokens = 0;
    let totalCostEstimate = 0.0;
    let operationCounts: Record<string, number> = {};

    usageSnapshot.forEach(doc => {
      const data = doc.data();
      totalTokens += (data.tokensUsed || 0);
      totalCostEstimate += (data.costEstimate || 0);
      const op = data.operation || "UNKNOWN";
      operationCounts[op] = (operationCounts[op] || 0) + 1;
    });

    // 2. Queue Success Rate & Metrics
    const queueSnapshot = await adminDb.collection('ai_jobs')
       .where("orgId", "==", orgId)
       .get();
       
    let totalJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;
    
    queueSnapshot.forEach(doc => {
       const status = doc.data().status;
       totalJobs++;
       if (status === 'completed') completedJobs++;
       if (status === 'failed') failedJobs++;
    });

    const queueSuccessRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 100;

    // 3. Cache Metrics (Approximation by checking how many models we skipped since we don't have explicit hits saved, 
    // but we can query cache size to show robustness of embedding layer).
    let resumeCacheItems = 0;
    let jdCacheItems = 0;
    
    try {
       const rCache = await adminDb.collection("resume_cache").count().get();
       resumeCacheItems = rCache.data().count;
       const jCache = await adminDb.collection("jd_cache").count().get();
       jdCacheItems = jCache.data().count;
    } catch (e) {
       console.error("Cache counting error", e);
    }
    
    return res.status(200).json({
       dateRange: "Last 30 Days",
       metrics: {
          totalTokensUsed: totalTokens,
          estimatedCostDollars: totalCostEstimate.toFixed(4),
          operations: operationCounts
       },
       infrastructure: {
          resumeCacheSize: resumeCacheItems,
          jdCacheSize: jdCacheItems,
          queueTotalJobs: totalJobs,
          queueSuccessRate: `${queueSuccessRate.toFixed(1)}%`,
          queueFailedJobs: failedJobs
       }
    });

  } catch (err: any) {
    console.error("[TELEMETRY_DASHBOARD_ERROR]", err);
    return res.status(500).json({ error: 'Failed to generate metrics dashboard' });
  }
}
