import { HireNestAgent, AgentMetadata, AgentExecutionContext, AgentResult } from '../../orchestrator/types';
import { BDMAgentMetadata } from './metadata';
import { BDM_SYSTEM_PROMPT } from './prompts';
import { AIGateway } from '../../../api-lib/services/AIGateway';
import { AgentExecutionContextHelper } from '../../orchestrator/AgentExecutionContext';
import { AgentResultHelper } from '../../orchestrator/AgentResult';
import { globalAgentRegistry } from '../../orchestrator/AgentRegistry';

export class BDMAgent implements HireNestAgent {
  metadata: AgentMetadata = BDMAgentMetadata;

  async execute(prompt: string, context: AgentExecutionContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      const memory = context.memory || await AgentExecutionContextHelper.loadMemory(this.metadata.id);

      let fullPrompt = `${BDM_SYSTEM_PROMPT}\n`;
      if (context.sessionHistory && context.sessionHistory.length > 0) {
        fullPrompt += `\nSession History:\n`;
        for (const turn of context.sessionHistory) {
          fullPrompt += `${turn.role === 'user' ? 'User' : 'Agent'}: ${turn.content}\n`;
        }
      }
      fullPrompt += `\nRequest Details: ${prompt}\n`;

      const gatewayResponse = await AIGateway.processChat({
        prompt: fullPrompt,
        feature: 'general',
      });

      const durationMs = Date.now() - startTime;
      await AgentExecutionContextHelper.recordExecution(this.metadata.id, prompt, gatewayResponse.response, true, durationMs);

      return AgentResultHelper.success(this.metadata.id, gatewayResponse.response, durationMs, {
        metrics: {
          tokensUsed: gatewayResponse.tokens,
          provider: gatewayResponse.provider,
          model: gatewayResponse.model,
          cached: gatewayResponse.cached,
        }
      });
    } catch (e: any) {
      const durationMs = Date.now() - startTime;
      await AgentExecutionContextHelper.recordExecution(this.metadata.id, prompt, e.message || String(e), false, durationMs);
      return AgentResultHelper.failure(this.metadata.id, e.message || String(e), durationMs);
    }
  }
}

globalAgentRegistry.register(new BDMAgent());
