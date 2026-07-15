// src/views/AIOpsCenter/AIOpsTypes.ts

export interface Agent {
  id: string;
  name: string;
  category: string;
  triggerType: string;
  schedule?: string;
  status: 'Draft' | 'Testing' | 'Review' | 'Approved' | 'Production' | 'Monitoring' | 'Archived' | string;
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

  // Agent OS additions (Sprint 1 & 2)
  version?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  goal?: string;
  instructions?: string;
  knowledgeBase?: string[];
  memoryType?: 'Platform' | 'Company' | 'Department' | 'Agent' | 'Conversation';
  memoryKeys?: string[];
  tools?: string[];
  permissions?: string[];
  kpis?: { name: string; target: string; current: string }[];
  costToday?: number;
  monthlyBudget?: number;
  runtimeConfig?: {
    modelRouter: string;
    temperature: number;
    maxTokens: number;
  };
  healthMetrics?: {
    latencyMs: number;
    retriesToday: number;
    failuresToday: number;
    uptime: number;
  };
  collaborationChannels?: string[];
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

export interface AIReport {
  id: string;
  agentId: string;
  agentName: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  title: string;
  content: string;
  status: 'unread' | 'acknowledged';
  timestamp: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface AIPolicy {
  id: string;
  title: string;
  category: string;
  description: string;
  status: 'active' | 'draft' | 'inactive';
  ruleCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: string;
}

