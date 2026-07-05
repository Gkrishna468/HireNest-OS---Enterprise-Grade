import { AgentMetadata } from '../../orchestrator/types';

export const BDMAgentMetadata: AgentMetadata = {
  id: 'bdm_agent',
  name: 'BDM Agent',
  role: 'bdm',
  purpose: 'Coordinates client acquisition, analyzes job requirements, and streamlines account relationships.',
  capabilities: ['Job Requirement Ingestion', 'Client Portfolio Assessment', 'Market Rate Intelligence'],
  tools: ['ingest_requirement', 'get_market_trends'],
  permissions: ['read:requirements', 'write:requirements', 'read:clients'],
  priority: 7,
  enabled: true,
  version: '1.0.0',
  owner: 'business',
  executionMode: 'interactive',
  preferredCapability: 'reasoning',
  maxExecutionTimeMs: 30000,
};
