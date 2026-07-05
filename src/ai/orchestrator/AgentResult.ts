import { AgentResult } from './types';

export class AgentResultHelper {
  /**
   * Builds a successful structured agent execution result
   */
  static success(
    agentId: string,
    output: string,
    durationMs: number,
    additional?: Partial<AgentResult>
  ): AgentResult {
    return {
      success: true,
      agentId,
      output,
      latencyMs: durationMs,
      ...additional,
    };
  }

  /**
   * Builds a failed agent execution result
   */
  static failure(
    agentId: string,
    error: string,
    durationMs: number,
    additional?: Partial<AgentResult>
  ): AgentResult {
    return {
      success: false,
      agentId,
      output: '',
      error,
      latencyMs: durationMs,
      ...additional,
    };
  }
}
