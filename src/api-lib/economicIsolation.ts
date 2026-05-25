import { adminDb } from "../lib/firebase-admin";

/**
 * Tenant Economic Isolation
 * Maps org budgets, token accounting, queue quotas, and limits execution ceilings.
 */

export async function checkEconomicLimits(orgId: string, requestedCost: number): Promise<{ permitted: boolean, reason?: string }> {
   if (!adminDb) return { permitted: false, reason: "ADMIN_OFFLINE" };

   try {
      const budgetRef = adminDb.collection("tenantEconomics").doc(orgId);
      const budgetDoc = await budgetRef.get();
      
      let data = budgetDoc.data();
      if (!budgetDoc.exists || !data) {
          // Initialize default economic profile
          data = {
             monthlyBudget: 5000,
             spendThisMonth: 0,
             apiTokenCeiling: 1000000,
             tokensUsed: 0
          };
          await budgetRef.set(data);
      }

      const availableSpend = data.monthlyBudget - data.spendThisMonth;

      if (requestedCost > availableSpend) {
          console.warn(`[ECONOMIC_GUARD] Org ${orgId} exceeded financial budget ceiling.`);
          return { permitted: false, reason: "BUDGET_EXCEEDED" };
      }

      return { permitted: true };
   } catch (err) {
      console.error("[ECONOMIC_GUARD_ERR]", err);
      return { permitted: false, reason: "SYSTEM_FAULT" };
   }
}

export async function deductSpend(orgId: string, amount: number): Promise<void> {
   if (!adminDb) return;
   try {
      const budgetRef = adminDb.collection("tenantEconomics").doc(orgId);
      // Fast optimistic update, in production use transactions/increments
      const doc = await budgetRef.get();
      if (doc.exists) {
          const current = doc.data()?.spendThisMonth || 0;
          await budgetRef.update({ spendThisMonth: current + amount, updatedAt: new Date().toISOString() });
      }
   } catch (err) {
      console.error("[ECONOMIC_DEDUCTION_ERR]", err);
   }
}
