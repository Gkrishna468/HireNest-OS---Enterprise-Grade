import { AgentMetadata } from '../../orchestrator/types';

export const RecruiterAgentMetadata: AgentMetadata = {
  id: 'recruiter_agent',
  name: 'Recruiter Agent',
  role: 'recruiter',
  purpose: 'Automates candidate sourcing, technical resume assessment, and engagement outreach.',
  capabilities: ['Resume Parsing', 'Candidate Screening', 'Outreach Writing', 'Interview Questions Generation'],
  tools: ['parse_resume', 'generate_interview_questions', 'email_template_builder'],
  permissions: ['read:candidates', 'write:candidates', 'read:requirements'],
  priority: 8,
  enabled: true,
  version: '1.0.0',
  owner: 'business',
  executionMode: 'interactive',
  preferredCapability: 'reasoning',
  maxExecutionTimeMs: 45000,
};
