import { AgentMetadata } from '../../orchestrator/types';

export const VendorManagerAgentMetadata: AgentMetadata = {
  id: 'vendor_manager_agent',
  name: 'Vendor Manager Agent',
  role: 'vendor_manager',
  purpose: 'Coordinates third-party agency interactions, evaluates vendor bench quality, and tracks vendor trust ratings.',
  capabilities: ['Vendor Quality Audits', 'Bench Consistency Checks', 'Compliance Enforcement'],
  tools: ['calculate_vendor_trust_score', 'audit_compliance'],
  permissions: ['read:vendors', 'write:vendors', 'read:candidates'],
  priority: 7,
  enabled: true,
  version: '1.0.0',
  owner: 'business',
  executionMode: 'interactive',
  preferredCapability: 'reasoning',
  maxExecutionTimeMs: 30000,
};
