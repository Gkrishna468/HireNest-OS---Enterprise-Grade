import { AgentMetadata, HireNestAgent } from './types';

export class AgentRegistry {
  private agents: Map<string, HireNestAgent> = new Map();
  private metadataRegistry: Map<string, AgentMetadata> = new Map();

  constructor() {
    // Initialized empty. Concrete agent classes will register themselves.
  }

  /**
   * Registers a concrete agent implementation along with its declarative metadata
   */
  register(agent: HireNestAgent): void {
    this.agents.set(agent.metadata.id, agent);
    this.metadataRegistry.set(agent.metadata.id, agent.metadata);
    console.log(`[AgentRegistry] Registered Agent: ${agent.metadata.name} (ID: ${agent.metadata.id})`);
  }

  /**
   * Retrieves an active agent by ID
   */
  getAgent(id: string): HireNestAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Retrieves metadata for a specific agent
   */
  getMetadata(id: string): AgentMetadata | undefined {
    return this.metadataRegistry.get(id);
  }

  /**
   * Returns all active agents
   */
  getAllAgents(): HireNestAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Returns metadata for all registered agents
   */
  getAllMetadata(): AgentMetadata[] {
    return Array.from(this.metadataRegistry.values());
  }
}

export const globalAgentRegistry = new AgentRegistry();
