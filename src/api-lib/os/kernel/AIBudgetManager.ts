import { db } from "../../../lib/firebase-admin.js";

export interface CloudBudgetSummary {
  monthlyLimitINR: number;
  targetOperatingLimitINR: number;
  contingencyReserveINR: number;
  currentSpendINR: number;
  remainingINR: number;
  projectedMonthEndINR: number;
  alertsTriggered: Array<{
    thresholdINR: number;
    percentage: number;
    label: string;
    triggered: boolean;
    timestamp?: string;
  }>;
  serviceBreakdownINR: {
    geminiAPI: number;
    firestore: number;
    appEngine: number;
    other: number;
  };
  allowed: boolean;
}

export class AIBudgetManager {
  public static readonly MONTHLY_LIMIT_INR = 200.0;
  public static readonly OPERATING_TARGET_INR = 150.0;
  public static readonly CONTINGENCY_RESERVE_INR = 50.0;

  public static readonly THRESHOLDS = [
    { thresholdINR: 50.0, percentage: 25, label: "25% Budget Milestone (₹50)" },
    { thresholdINR: 100.0, percentage: 50, label: "50% Budget Milestone (₹100)" },
    { thresholdINR: 150.0, percentage: 75, label: "75% Target Control Limit (₹150)" },
    { thresholdINR: 180.0, percentage: 90, label: "90% Critical Alert Threshold (₹180)" },
    { thresholdINR: 200.0, percentage: 100, label: "100% Monthly Cap Reached (₹200)" },
  ];

  /**
   * Checks if remaining monthly budget in INR permits the requested AI operation.
   */
  static async checkMonthlyCloudBudget(
    tenantId: string = "global_hq",
    estimatedCostINR: number = 0.05
  ): Promise<{ allowed: boolean; remainingINR: number; projectedMonthEndINR: number; alertMessage?: string }> {
    if (!db) {
      return { allowed: true, remainingINR: 200.0, projectedMonthEndINR: 42.15 };
    }

    const currentMonth = new Date().toISOString().substring(0, 7); // "2026-10"
    const now = new Date();
    const dayOfMonth = Math.max(1, now.getDate());
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const docRef = db.collection("cloud_billing_monthly").doc(`${tenantId}_${currentMonth}`);
    const snap = await docRef.get();

    let currentSpendINR = 42.15; // Oct baseline from billing export
    if (snap.exists) {
      currentSpendINR = snap.data()?.totalSpendINR ?? currentSpendINR;
    } else {
      await docRef.set({
        month: currentMonth,
        tenantId,
        monthlyLimitINR: this.MONTHLY_LIMIT_INR,
        operatingTargetINR: this.OPERATING_TARGET_INR,
        totalSpendINR: currentSpendINR,
        geminiAPISpendINR: 11.05,
        firestoreSpendINR: 0.01,
        appEngineSpendINR: 31.09,
        otherSpendINR: 0.00,
        updatedAt: new Date().toISOString(),
      }).catch((e: any) => console.warn("[AIBudgetManager] Initial budget set warning:", e));
    }

    const remainingINR = Math.max(0, this.MONTHLY_LIMIT_INR - currentSpendINR);
    const projectedMonthEndINR = (currentSpendINR / dayOfMonth) * totalDaysInMonth;

    if (currentSpendINR + estimatedCostINR > this.MONTHLY_LIMIT_INR) {
      return {
        allowed: false,
        remainingINR,
        projectedMonthEndINR,
        alertMessage: `HN-COST-GUARD: Monthly Cloud Limit of ₹200.00 reached (Current: ₹${currentSpendINR.toFixed(2)}). Optional AI call rejected to enforce zero overspend.`
      };
    }

    return {
      allowed: true,
      remainingINR,
      projectedMonthEndINR
    };
  }

  /**
   * Deducts AI expenditure in INR from monthly cloud budget document.
   */
  static async deductMonthlyCloudBudget(
    tenantId: string = "global_hq",
    actualCostINR: number = 0.01,
    service: "geminiAPI" | "firestore" | "appEngine" | "other" = "geminiAPI"
  ) {
    if (!db || actualCostINR <= 0) return;

    const currentMonth = new Date().toISOString().substring(0, 7);
    const docRef = db.collection("cloud_billing_monthly").doc(`${tenantId}_${currentMonth}`);

    try {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        const data = snap.data() || {
          totalSpendINR: 42.15,
          geminiAPISpendINR: 11.05,
          firestoreSpendINR: 0.01,
          appEngineSpendINR: 31.09,
          otherSpendINR: 0.00,
        };

        const oldSpend = data.totalSpendINR || 0;
        const newTotalSpend = oldSpend + actualCostINR;
        const serviceField = `${service}SpendINR`;
        const oldServiceSpend = data[serviceField] || 0;

        transaction.set(docRef, {
          ...data,
          month: currentMonth,
          tenantId,
          monthlyLimitINR: this.MONTHLY_LIMIT_INR,
          totalSpendINR: newTotalSpend,
          [serviceField]: oldServiceSpend + actualCostINR,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
    } catch (e: any) {
      console.warn("[AIBudgetManager] Failed to deduct monthly cloud budget:", e?.message || e);
    }
  }

  /**
   * Returns comprehensive monthly cost dashboard state.
   */
  static async getMonthlyCloudBudgetSummary(tenantId: string = "global_hq"): Promise<CloudBudgetSummary> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const now = new Date();
    const dayOfMonth = Math.max(1, now.getDate());
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let data = {
      totalSpendINR: 42.15,
      geminiAPISpendINR: 11.05,
      firestoreSpendINR: 0.01,
      appEngineSpendINR: 31.09,
      otherSpendINR: 0.00,
    };

    if (db) {
      try {
        const snap = await db.collection("cloud_billing_monthly").doc(`${tenantId}_${currentMonth}`).get();
        if (snap.exists) {
          data = { ...data, ...snap.data() };
        }
      } catch (err) {
        console.warn("[AIBudgetManager] Error reading monthly budget summary:", err);
      }
    }

    const currentSpendINR = data.totalSpendINR;
    const remainingINR = Math.max(0, this.MONTHLY_LIMIT_INR - currentSpendINR);
    const projectedMonthEndINR = (currentSpendINR / dayOfMonth) * totalDaysInMonth;

    const alertsTriggered = this.THRESHOLDS.map((t) => ({
      thresholdINR: t.thresholdINR,
      percentage: t.percentage,
      label: t.label,
      triggered: currentSpendINR >= t.thresholdINR,
      timestamp: currentSpendINR >= t.thresholdINR ? new Date().toISOString() : undefined,
    }));

    return {
      monthlyLimitINR: this.MONTHLY_LIMIT_INR,
      targetOperatingLimitINR: this.OPERATING_TARGET_INR,
      contingencyReserveINR: this.CONTINGENCY_RESERVE_INR,
      currentSpendINR,
      remainingINR,
      projectedMonthEndINR,
      alertsTriggered,
      serviceBreakdownINR: {
        geminiAPI: data.geminiAPISpendINR,
        firestore: data.firestoreSpendINR,
        appEngine: data.appEngineSpendINR,
        other: data.otherSpendINR,
      },
      allowed: currentSpendINR < this.MONTHLY_LIMIT_INR,
    };
  }

  /**
   * Backward compatibility daily check
   */
  static async checkBudget(
    officeName: string,
    estimatedCost: number = 0.01
  ): Promise<{ allowed: boolean; remaining: number }> {
    const res = await this.checkMonthlyCloudBudget("global_hq", estimatedCost * 80.0);
    return { allowed: res.allowed, remaining: res.remainingINR / 80.0 };
  }

  static async deductBudget(officeName: string, actualCost: number) {
    await this.deductMonthlyCloudBudget("global_hq", actualCost * 80.0, "geminiAPI");
  }
}
