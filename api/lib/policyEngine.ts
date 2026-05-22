/**
 * Financial Policy Engine
 * Determines platform margins and vendor payouts based on dynamic slabs,
 * enterprise overrides, and vendor quality tiers.
 */
export async function computeFinancials(adminDb: any, payload: {
  actualBudget: number;
  currency?: string;
  vendorQualityScore?: number;
  enterpriseId?: string;
}) {
  const { actualBudget, vendorQualityScore = 80, enterpriseId } = payload;
  
  // Default values
  let platformRate = 0.0833; // Default 8.33% Admin deduction
  
  if (!adminDb) {
     return {
        marginRate: platformRate,
        profit: Math.round(actualBudget * platformRate),
        vendorPayout: actualBudget - Math.round(actualBudget * platformRate),
        appliedPolicy: "fallback_static",
        reason: "Admin DB offline"
     }
  }

  try {
    // 1. Check for Enterprise Overrides
    if (enterpriseId) {
      const orgDoc = await adminDb.collection("organizations").doc(enterpriseId).get();
      if (orgDoc.exists) {
        const orgData = orgDoc.data();
        if (orgData.negotiatedMargin) {
           platformRate = orgData.negotiatedMargin; // e.g. 0.06 for 6%
        }
      }
    }

    // 2. Dynamic Slabs based on Budget
    if (actualBudget > 100000) {
      platformRate = Math.max(0.05, platformRate - 0.01); // Volume discount
    }

    // 3. Vendor Quality Tier Adjustments (Higher Quality = lower platform take)
    if (vendorQualityScore > 90) {
       platformRate = Math.max(0.04, platformRate - 0.02); // Premium Vendor Bonus
    } else if (vendorQualityScore < 50) {
       platformRate = Math.min(0.15, platformRate + 0.03); // High Risk Vendor Penalty
    }

    const profit = Math.round(actualBudget * platformRate);
    const vendorPayout = actualBudget - profit;

    return {
      marginRate: platformRate,
      profit,
      vendorPayout,
      appliedPolicy: "dynamic_governance",
      details: {
        budgetSlabApplied: actualBudget > 100000,
        qualityAdjusted: vendorQualityScore > 90 || vendorQualityScore < 50,
        enterpriseOverride: !!enterpriseId
      }
    };
  } catch (err) {
    console.warn("Policy Engine computation failed, returning to static rules:", err);
    return {
       marginRate: 0.0833,
       profit: Math.round(actualBudget * 0.0833),
       vendorPayout: actualBudget - Math.round(actualBudget * 0.0833),
       appliedPolicy: "fallback_static",
       reason: "Failure during computation"
    }
  }
}
