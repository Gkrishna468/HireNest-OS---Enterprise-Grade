export enum TrustGrade {
  AAA = "AAA (Verified Alpha)",
  AA = "AA (High Trust)",
  A = "A (Operating)",
  B = "B (Under Review)",
  C = "C (De-prioritized)"
}

export const ORCHESTRATION_POLICIES = {
  MIN_TRUST_FOR_PREMIUM: 90,
  SLA_BREACH_PENALTY: 5,
  CLOSURE_BONUS: 2,
  DUPLICATE_RISK_THRESHOLD: 70,
  MARGIN_LEAKAGE_THRESHOLD: 2000, 
};

export const RISK_SIGNALS = {
  SYNT_GEN: "Synthetic Resume Signature Detected",
  DUPE_ID: "Cross-Network Duplicate Signal",
  GHOST_FREQ: "High Latency Response Pattern",
  VENDOR_DECAY: "Declining Delivery Consistency",
};
