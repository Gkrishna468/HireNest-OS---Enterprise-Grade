import { adminDb } from "../lib/firebase-admin";

export async function logAiUsage(params: {
  traceId: string;
  orgId: string;
  operation: string;
  tokensUsed: number;
  model: string;
  costEstimate: number;
}) {
  if (!adminDb) return;
  const billingCycle = new Date().toISOString().substring(0, 7);

  try {
    // 1. Log Immutable Append-Only Usage Record
    await adminDb.collection("ai_usage_logs").add({
      traceId: params.traceId,
      orgId: params.orgId,
      operation: params.operation,
      tokensUsed: params.tokensUsed,
      model: params.model,
      costEstimate: params.costEstimate,
      createdAt: new Date().toISOString(),
    });

    // 2. Update Tenant Usage Rollup / Quotas
    const usageRef = adminDb.collection("tenant_usage").doc(`${params.orgId}_${billingCycle}`);
    const usageDoc = await usageRef.get();

    if (!usageDoc.exists) {
      await usageRef.set({
        orgId: params.orgId,
        plan: "ENTERPRISE",
        monthlyTokenLimit: 5000000,
        usedTokens: params.tokensUsed,
        remainingTokens: 5000000 - params.tokensUsed,
        aiRequests: 1,
        resumeParses: params.operation === "PARSE_RESUME" ? 1 : 0,
        candidateMatches: params.operation === "MATCH_CANDIDATE" ? 1 : 0,
        lastResetAt: new Date().toISOString(),
        billingCycle,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const data = usageDoc.data()!;
      await usageRef.update({
        usedTokens: (data.usedTokens || 0) + params.tokensUsed,
        remainingTokens: Math.max((data.monthlyTokenLimit || 5000000) - ((data.usedTokens || 0) + params.tokensUsed), 0),
        aiRequests: (data.aiRequests || 0) + 1,
        resumeParses: params.operation === "PARSE_RESUME" ? (data.resumeParses || 0) + 1 : (data.resumeParses || 0),
        candidateMatches: params.operation === "MATCH_CANDIDATE" ? (data.candidateMatches || 0) + 1 : (data.candidateMatches || 0),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[GOVERNANCE] Failed to log AI usage:", err);
  }
}
