import { db } from "../../../lib/firebase-admin.js";

export class AIBudgetManager {
  /**
   * Checks if the office has remaining budget for today.
   * Optionally returns boolean for fallback.
   */
  static async checkBudget(
    officeName: string,
    estimatedCost: number = 0.01,
  ): Promise<{ allowed: boolean; remaining: number }> {
    if (!db) return { allowed: true, remaining: 999 };

    const today = new Date().toISOString().split("T")[0];
    const budgetRef = db.collection("ai_budgets").doc(`${officeName}_${today}`);

    const doc = await budgetRef.get();
    let remaining = 15.0; // default daily budget $15

    if (doc.exists) {
      remaining = doc.data()?.remaining ?? remaining;
    } else {
      await budgetRef.set({
        office: officeName,
        date: today,
        dailyLimit: 15.0,
        remaining: 15.0,
        spend: 0,
      });
    }

    if (remaining < estimatedCost) {
      return { allowed: false, remaining };
    }

    return { allowed: true, remaining };
  }

  /**
   * Deducts cost from budget after execution
   */
  static async deductBudget(officeName: string, actualCost: number) {
    if (!db) return;

    const today = new Date().toISOString().split("T")[0];
    const budgetRef = db.collection("ai_budgets").doc(`${officeName}_${today}`);

    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(budgetRef);
        if (doc.exists) {
          const data = doc.data();
          const newRemaining = Math.max(0, (data?.remaining || 0) - actualCost);
          const newSpend = (data?.spend || 0) + actualCost;
          transaction.update(budgetRef, {
            remaining: newRemaining,
            spend: newSpend,
          });
        }
      });
    } catch (e) {
      console.error("[AIBudgetManager] Failed to deduct budget", e);
    }
  }
}
