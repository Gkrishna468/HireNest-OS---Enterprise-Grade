import { OpenUIComponentVersionedName, OpenUIActionName } from '../../types.js';

export interface OpenUIComponentMetadata {
  name: string;
  version: string;
  description: string;
  allowedActions: OpenUIActionName[];
}

export const OPENUI_COMPONENT_REGISTRY: Record<OpenUIComponentVersionedName, OpenUIComponentMetadata> = {
  'KPIGrid@1.0': {
    name: 'KPIGrid',
    version: '1.0',
    description: 'Displays a grid of key performance indicators and high-level recruiter metrics.',
    allowedActions: ['ASSIGN_TASK', 'CREATE_FOLLOWUP'],
  },
  'CandidateTable@1.0': {
    name: 'CandidateTable',
    version: '1.0',
    description: 'Renders a dense candidate roster with matching scores and quick action buttons.',
    allowedActions: ['SHORTLIST_CANDIDATE', 'SUBMIT_CANDIDATE', 'VIEW_CANDIDATE'],
  },
  'CandidateCard@1.0': {
    name: 'CandidateCard',
    version: '1.0',
    description: 'Detailed interactive focus card for a single applicant showing skills and history.',
    allowedActions: ['SHORTLIST_CANDIDATE', 'SUBMIT_CANDIDATE', 'REQUEST_CANDIDATE_UPDATE', 'VIEW_CANDIDATE'],
  },
  'RequirementHealth@1.0': {
    name: 'RequirementHealth',
    version: '1.0',
    description: 'Requirement health metrics, SLA targets, and critical sourcing gaps.',
    allowedActions: ['APPROVE_SLA', 'VIEW_REQUIREMENT'],
  },
  'RequirementCard@1.0': {
    name: 'RequirementCard',
    version: '1.0',
    description: 'Interactive overview of a specific position or job order in the pipeline.',
    allowedActions: ['APPROVE_SLA', 'LAUNCH_CAMPAIGN', 'VIEW_REQUIREMENT'],
  },
  'VendorPerformance@1.0': {
    name: 'VendorPerformance',
    version: '1.0',
    description: 'Performance stats, placement counts, and trust scores for suppliers.',
    allowedActions: ['LAUNCH_CAMPAIGN', 'VIEW_VENDOR'],
  },
  'SubmissionTimeline@1.0': {
    name: 'SubmissionTimeline',
    version: '1.0',
    description: 'Tracks candidates sequentially as they move across stages of the recruitment workflow.',
    allowedActions: ['SHORTLIST_CANDIDATE', 'REQUEST_CANDIDATE_UPDATE'],
  },
  'SkillsMatrix@1.0': {
    name: 'SkillsMatrix',
    version: '1.0',
    description: 'An evaluation matrix plotting candidate expertise against client requirements.',
    allowedActions: ['OVERRIDE_MATCH_SCORE', 'VIEW_CANDIDATE'],
  },
  'AIInsight@1.0': {
    name: 'AIInsight',
    version: '1.0',
    description: 'Smart executive summary outlining matched insights, risks, and next steps.',
    allowedActions: ['CREATE_FOLLOWUP'],
  },
  'FollowUpCard@1.0': {
    name: 'FollowUpCard',
    version: '1.0',
    description: 'Actionable reminder for client meetings, follow-ups, or outstanding reviews.',
    allowedActions: ['CREATE_FOLLOWUP', 'ASSIGN_TASK'],
  },
  'TaskBoard@1.0': {
    name: 'TaskBoard',
    version: '1.0',
    description: 'Kanban-style boards for outstanding recruitment tasks and collaboration cards.',
    allowedActions: ['ASSIGN_TASK', 'CREATE_FOLLOWUP'],
  },
  'RevenueCard@1.0': {
    name: 'RevenueCard',
    version: '1.0',
    description: 'Shows placed value, commissions splits, potential revenue pipeline and risks.',
    allowedActions: ['LAUNCH_CAMPAIGN'],
  },
};

export const OPENUI_COMPONENTS = Object.values(OPENUI_COMPONENT_REGISTRY);
