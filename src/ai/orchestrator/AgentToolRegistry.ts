import { AgentPermissionLevel } from './types.js';

export interface AgentToolDefinition {
  id: string;
  name: string;
  description: string;
  permissionLevel: AgentPermissionLevel;
  requiresHumanApproval: boolean;
  category: 'RECRUITMENT' | 'CRM' | 'OPERATIONS' | 'COMMUNICATION' | 'COMPLIANCE';
  parametersSchema?: Record<string, any>;
  handler: (params: any, context: any) => Promise<any>;
}

export class AgentToolRegistry {
  private tools: Map<string, AgentToolDefinition> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  registerTool(tool: AgentToolDefinition): void {
    this.tools.set(tool.id, tool);
    console.log(`[AgentToolRegistry] Registered Tool: ${tool.name} (${tool.id}) [Level: ${tool.permissionLevel}]`);
  }

  getTool(id: string): AgentToolDefinition | undefined {
    return this.tools.get(id);
  }

  getAllTools(): AgentToolDefinition[] {
    return Array.from(this.tools.values());
  }

  private registerDefaultTools() {
    // 1. READ LEVEL TOOLS
    this.registerTool({
      id: 'inspect_candidate_profile',
      name: 'Inspect Candidate Profile',
      description: 'Reads profile, resume skills, and history for candidate',
      permissionLevel: 'READ',
      requiresHumanApproval: false,
      category: 'RECRUITMENT',
      handler: async (params, ctx) => {
        return { action: 'INSPECT_CANDIDATE', candidateId: params.candidateId, status: 'SUCCESS' };
      }
    });

    this.registerTool({
      id: 'inspect_requirement',
      name: 'Inspect Requirement',
      description: 'Reads requirements, job specifications, and status',
      permissionLevel: 'READ',
      requiresHumanApproval: false,
      category: 'RECRUITMENT',
      handler: async (params, ctx) => {
        return { action: 'INSPECT_REQUIREMENT', requirementId: params.requirementId, status: 'SUCCESS' };
      }
    });

    this.registerTool({
      id: 'inspect_client_account',
      name: 'Inspect Client Account',
      description: 'Reads client account info, contacts, and active roles',
      permissionLevel: 'READ',
      requiresHumanApproval: false,
      category: 'CRM',
      handler: async (params, ctx) => {
        return { action: 'INSPECT_CLIENT', clientId: params.clientId, status: 'SUCCESS' };
      }
    });

    // 2. PROPOSE LEVEL TOOLS
    this.registerTool({
      id: 'propose_candidate_match',
      name: 'Propose Candidate Match',
      description: 'Generates match scoring, rationale, and recommendation for recruiter review',
      permissionLevel: 'PROPOSE',
      requiresHumanApproval: true,
      category: 'RECRUITMENT',
      handler: async (params, ctx) => {
        return { action: 'PROPOSE_MATCH', matchScore: params.score || 88, status: 'PROPOSED' };
      }
    });

    this.registerTool({
      id: 'propose_bdm_battlecard',
      name: 'Propose BDM Battlecard',
      description: 'Generates account intelligence, hiring signals, and entry strategy for client',
      permissionLevel: 'PROPOSE',
      requiresHumanApproval: true,
      category: 'CRM',
      handler: async (params, ctx) => {
        return { action: 'PROPOSE_BATTLECARD', clientId: params.clientId, status: 'PROPOSED' };
      }
    });

    this.registerTool({
      id: 'propose_stale_requirement_action',
      name: 'Propose Stale Requirement Action',
      description: 'Flags requirement with 0 submissions and proposes re-engagement or vendor broadcast',
      permissionLevel: 'PROPOSE',
      requiresHumanApproval: true,
      category: 'OPERATIONS',
      handler: async (params, ctx) => {
        return { action: 'PROPOSE_STALE_ACTION', requirementId: params.requirementId, status: 'PROPOSED' };
      }
    });

    // 3. EXECUTE LEVEL CONTROLLED TOOLS
    this.registerTool({
      id: 'create_follow_up_task',
      name: 'Create Follow-Up Task',
      description: 'Schedules follow-up reminder or CRM task for BDM / Recruiter',
      permissionLevel: 'EXECUTE',
      requiresHumanApproval: false,
      category: 'OPERATIONS',
      handler: async (params, ctx) => {
        return { action: 'CREATE_TASK', taskId: `task-${Date.now()}`, title: params.title, status: 'CREATED' };
      }
    });

    this.registerTool({
      id: 'submit_candidate_controlled',
      name: 'Submit Candidate (Controlled)',
      description: 'Triggers candidate submission through Governance Gate & Candidate Ownership Vault',
      permissionLevel: 'EXECUTE',
      requiresHumanApproval: true, // Sensitive action: Mandatory approval
      category: 'RECRUITMENT',
      handler: async (params, ctx) => {
        return { action: 'SUBMIT_CANDIDATE', candidateId: params.candidateId, requirementId: params.requirementId, status: 'SUBMITTED' };
      }
    });

    // 4. BROWSER WORKER TOOL
    this.registerTool({
      id: 'isolated_browser_navigation',
      name: 'Isolated Browser Navigation',
      description: 'Executes secure clean-room web search or public URL retrieval (SSRF protected)',
      permissionLevel: 'EXECUTE',
      requiresHumanApproval: false,
      category: 'OPERATIONS',
      handler: async (params, ctx) => {
        const url = params.url;
        if (!url) throw new Error("Missing required parameter: url");
        const userId = ctx.userId || 'anonymous';
        const orgId = ctx.orgId || 'anonymous';
        return await BrowserWorkerService.executeNavigation(url, userId, orgId);
      }
    });
  }
}

// ==========================================
// Isolated Browser Worker Service (P2)
// ==========================================
export class BrowserWorkerService {
  private static readonly DENIED_HOSTS = new Set<string>([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254', // AWS/GCP Metadata
    'metadata.google.internal'
  ]);

  private static readonly ALLOWED_PROTOCOLS = new Set<string>([
    'http:',
    'https:'
  ]);

  public static async executeNavigation(url: string, userId: string, orgId: string): Promise<any> {
    // 1. Emergency Kill Switch Check
    if (process.env.KILL_SWITCH_BROWSER === "true") {
      throw new Error("BROWSER_WORKER_KILLED: Browser worker is disabled due to platform emergency kill switch.");
    }

    // 2. SSRF Protection & URL Parsing
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("INVALID_URL: The provided web address is malformed.");
    }

    if (!this.ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      throw new Error(`FORBIDDEN_PROTOCOL: Protocol '${parsedUrl.protocol}' is restricted. Only HTTP and HTTPS are permitted.`);
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (this.DENIED_HOSTS.has(host) || host.endsWith('.local') || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.16.')) {
      throw new Error(`SSRF_PREVENTION_BLOCKED: Navigation to internal/loopback host '${host}' is blocked for security.`);
    }

    console.log(`[BrowserWorkerService] Safe navigation authorized to: ${url} for user: ${userId}`);

    // 3. Isolated Fetch Navigation (Clean-room Sandbox Simulation)
    const timeoutMs = 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HireNestOS-Agent-Computer/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'X-Agent-Auth-Token': process.env.BROWSER_WORKER_AUTH_TOKEN || 'secure-computer-token'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      const contentLengthStr = res.headers.get('content-length') || '0';
      const contentLength = parseInt(contentLengthStr, 10);

      // Download limit enforcement (Max 10MB)
      if (contentLength > 10 * 1024 * 1024) {
        throw new Error("DOWNLOAD_LIMIT_EXCEEDED: Resource payload size exceeds the maximum permitted size of 10MB.");
      }

      if (!res.ok) {
        throw new Error(`NAVIGATION_FAILED: Host returned status ${res.status}`);
      }

      const text = await res.text();
      
      // Clean HTML / extract text simulation (OpenMuse Capability Blueprint)
      const cleanText = text
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*?>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 10000); // Truncate payload size safely

      return {
        url,
        status: 'SUCCESS',
        contentType,
        contentLength,
        extractedText: cleanText + (text.length > 10000 ? ' [Content Truncated Safely]' : '')
      };

    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`BROWSER_WORKER_EXCEPTION: Navigation to URL failed - ${err.message}`);
    }
  }
}

export const globalAgentToolRegistry = new AgentToolRegistry();
