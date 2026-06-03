import { auditArchitecture } from "./architectureAuditor";
import { auditDataGovernance } from "./dataGovernanceAuditor";
import { auditAIGovernance } from "./aiGovernanceAuditor";
import { auditProductGovernance } from "./productGovernanceAuditor";

export interface ReleaseAuditResult {
  architecture: { pass: boolean; log: string };
  data: { pass: boolean; log: string };
  ai: { pass: boolean; log: string };
  product: { pass: boolean; log: string };
  approved: boolean;
  timestamp: string;
}

export async function runReleaseGateAudit(): Promise<ReleaseAuditResult> {
  // Execute audits concurrently
  const [arch, data, ai, prod] = await Promise.all([
    auditArchitecture(),
    auditDataGovernance(),
    auditAIGovernance(),
    auditProductGovernance()
  ]);

  const approved = arch.pass && data.pass && ai.pass && prod.pass;

  return {
    architecture: arch,
    data: data,
    ai: ai,
    product: prod,
    approved,
    timestamp: new Date().toISOString()
  };
}
