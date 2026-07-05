import { AgentMetadata } from '../../orchestrator/types';

export const ExecutiveDashboardAgentMetadata: AgentMetadata = {
  id: 'executive_dashboard_agent',
  name: 'Executive Dashboard Agent',
  role: 'executive_brief',
  purpose: 'Aggregates platform financials, platform margins, and forecasts to compile high-impact executive summaries.',
  capabilities: ['Revenue Assessment', 'AI Efficiency Tracking', 'Platform Health Auditing'],
  tools: ['calculate_roi', 'generate_briefing'],
  permissions: ['read:metrics', 'read:financials'],
  priority: 10,
  enabled: true,
  version: '1.0.0',
  owner: 'system',
  executionMode: 'scheduled',
  preferredCapability: 'reasoning',
  maxExecutionTimeMs: 60000,
};
