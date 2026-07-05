import { AgentMetadata } from '../../orchestrator/types';

export const MatchingAgentMetadata: AgentMetadata = {
  id: 'matching_agent',
  name: 'Matching Agent',
  role: 'matching_engine',
  purpose: 'Executes highly detailed candidate-to-requirement matches using semantic and deterministic inference.',
  capabilities: ['Semantic Candidate Matching', 'Skill Gap Identification', 'Over-qualification Audits'],
  tools: ['query_candidate_matches', 'evaluate_gaps'],
  permissions: ['read:candidates', 'read:requirements', 'write:submissions'],
  priority: 9,
  enabled: true,
  version: '1.0.0',
  owner: 'system',
  executionMode: 'interactive',
  preferredCapability: 'reasoning',
  maxExecutionTimeMs: 30000,
};
