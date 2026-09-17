import { OpenUIActionName, OpenUIActionDefinition, OpenUIRole } from '../../types';

const ADMIN_ROLES: OpenUIRole[] = ['admin', 'super_admin', 'ops_admin', 'hq_admin'];
const CLIENT_ROLES: OpenUIRole[] = ['client', 'hiring_manager', 'client_hm', 'client_recruiter', 'client_finance'];
const RECRUITER_ROLES: OpenUIRole[] = ['recruiter', 'vendor'];
const ALL_ROLES: OpenUIRole[] = [...ADMIN_ROLES, ...CLIENT_ROLES, ...RECRUITER_ROLES];

export const OPENUI_ACTION_REGISTRY: Record<OpenUIActionName, OpenUIActionDefinition> = {
  APPROVE_SLA: {
    action: 'APPROVE_SLA',
    requiredRole: [...ADMIN_ROLES, ...CLIENT_ROLES],
    requiredPermission: 'sla.approve',
    confirmationRequired: 'confirm',
    auditRequired: true,
  },
  OVERRIDE_MATCH_SCORE: {
    action: 'OVERRIDE_MATCH_SCORE',
    requiredRole: [...ADMIN_ROLES, ...CLIENT_ROLES, ...RECRUITER_ROLES],
    requiredPermission: 'candidate.match_override',
    confirmationRequired: 'confirm_with_reason',
    auditRequired: true,
  },
  SHORTLIST_CANDIDATE: {
    action: 'SHORTLIST_CANDIDATE',
    requiredRole: [...ADMIN_ROLES, ...CLIENT_ROLES, ...RECRUITER_ROLES],
    requiredPermission: 'candidate.shortlist',
    confirmationRequired: 'confirm',
    auditRequired: true,
  },
  SUBMIT_CANDIDATE: {
    action: 'SUBMIT_CANDIDATE',
    requiredRole: [...ADMIN_ROLES, ...RECRUITER_ROLES],
    requiredPermission: 'candidate.submit',
    confirmationRequired: 'confirm',
    auditRequired: true,
  },
  REQUEST_CANDIDATE_UPDATE: {
    action: 'REQUEST_CANDIDATE_UPDATE',
    requiredRole: [...ADMIN_ROLES, ...RECRUITER_ROLES],
    requiredPermission: 'candidate.request_update',
    confirmationRequired: 'none',
    auditRequired: false,
  },
  CREATE_FOLLOWUP: {
    action: 'CREATE_FOLLOWUP',
    requiredRole: ALL_ROLES,
    requiredPermission: 'task.create',
    confirmationRequired: 'none',
    auditRequired: false,
  },
  ASSIGN_TASK: {
    action: 'ASSIGN_TASK',
    requiredRole: ALL_ROLES,
    requiredPermission: 'task.assign',
    confirmationRequired: 'none',
    auditRequired: false,
  },
  LAUNCH_CAMPAIGN: {
    action: 'LAUNCH_CAMPAIGN',
    requiredRole: [...ADMIN_ROLES, ...RECRUITER_ROLES],
    requiredPermission: 'campaign.launch',
    confirmationRequired: 'confirm',
    auditRequired: true,
  },
  VIEW_REQUIREMENT: {
    action: 'VIEW_REQUIREMENT',
    requiredRole: ALL_ROLES,
    requiredPermission: 'requirement.view',
    confirmationRequired: 'none',
    auditRequired: false,
  },
  VIEW_VENDOR: {
    action: 'VIEW_VENDOR',
    requiredRole: [...ADMIN_ROLES, ...CLIENT_ROLES],
    requiredPermission: 'vendor.view',
    confirmationRequired: 'none',
    auditRequired: false,
  },
  VIEW_CANDIDATE: {
    action: 'VIEW_CANDIDATE',
    requiredRole: ALL_ROLES,
    requiredPermission: 'candidate.view',
    confirmationRequired: 'none',
    auditRequired: false,
  },
};
