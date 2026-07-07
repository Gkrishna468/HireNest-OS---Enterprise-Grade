// src/views/AIOpsCenter/AIOpsTypes.ts

export interface Agent {
  id: string;
  name: string;
  category: string;
  triggerType: string;
  schedule?: string;
  status: string;
  enabled: boolean;
  desc: string;
  successRate?: number;
  avgRuntime?: number;
  execsToday?: number;
  failureCount?: number;
  lastRun?: string;
  model?: string;
  // Named AI employee registry extensions
  department: string;
  ownerName: string;
  reportsTo: string;
  currentTask: string;
  approvalAuthority: string;
  nextTask: string;
  lastReportSent: string;
}

export interface Execution {
  id: string;
  jobId?: string;
  agentId: string;
  orgId?: string | null;
  inputs?: any;
  outputs?: any;
  error?: string;
  duration: number;
  tokens?: number;
  model?: string;
  status: 'success' | 'error';
  timestamp: string;
  // Cognitive trace audit parameters
  requirementId?: string;
  client?: string;
  owner?: string;
  promptVersion?: string;
  toolsUsed?: string[];
  cost?: number;
  decision?: string;
  confidence?: number;
}

export interface BusinessEvent {
  id: string;
  type: string;
  timestamp: string;
  origin: string;
  status: 'nominal' | 'escalated';
  payload: any;
}

export interface RequirementOwnership {
  id: string;
  title: string;
  client: string;
  bdm: string;
  recruiter: string;
  manager: string;
  aiAgents: string[];
  lastAiActivity: string;
  slaStatus: 'healthy' | 'warning' | 'breached';
  escalationPath: string;
  history: { date: string; action: string; actor: string }[];
}

export interface PlatformActivity {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  type: 'AI' | 'HUMAN' | 'SLA' | 'FINANCE' | 'SYSTEM';
  status: 'info' | 'warning' | 'success' | 'critical';
  payload?: any;
}
