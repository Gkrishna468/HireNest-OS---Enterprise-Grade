import { HireNestAgent, AgentMetadata, AgentExecutionContext, AgentResult } from '../../orchestrator/types';
import { RecruiterAgentMetadata } from './metadata';
import { RECRUITER_SYSTEM_PROMPT } from './prompts';
import { AIGateway } from '../../../api-lib/services/AIGateway';
import { AgentExecutionContextHelper } from '../../orchestrator/AgentExecutionContext';
import { AgentResultHelper } from '../../orchestrator/AgentResult';
import { globalAgentRegistry } from '../../orchestrator/AgentRegistry';

export class RecruiterAgent implements HireNestAgent {
  metadata: AgentMetadata = RecruiterAgentMetadata;

  async execute(prompt: string, context: AgentExecutionContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      // 1. Load persistent memory
      const memory = context.memory || await AgentExecutionContextHelper.loadMemory(this.metadata.id);

      // 2. Build full contextual prompt
      let fullPrompt = `${RECRUITER_SYSTEM_PROMPT}\n`;
      
      // Inject memory context (e.g. learned preferences)
      if (memory.learnedPreferences && Object.keys(memory.learnedPreferences).length > 0) {
        fullPrompt += `\nLearned Recruiter Preferences:\n${JSON.stringify(memory.learnedPreferences, null, 2)}\n`;
      }
      
      if (context.sessionHistory && context.sessionHistory.length > 0) {
        fullPrompt += `\nSession History:\n`;
        for (const turn of context.sessionHistory) {
          fullPrompt += `${turn.role === 'user' ? 'User' : 'Agent'}: ${turn.content}\n`;
        }
      }

      fullPrompt += `\nUser Request: ${prompt}\n`;

      // 3. Call AI Gateway with capability routing ('semantic_reasoning' maps to deepseek/gemini-pro)
      const gatewayResponse = await AIGateway.processChat({
        prompt: fullPrompt,
        feature: 'semantic_reasoning',
      });

      const durationMs = Date.now() - startTime;

      // 4. Record execution stats
      await AgentExecutionContextHelper.recordExecution(
        this.metadata.id,
        prompt,
        gatewayResponse.response,
        true,
        durationMs
      );

      // 5. Simple self-improvement loop: Extract and persist user explicit preferences
      if (prompt.toLowerCase().includes('prefer') || prompt.toLowerCase().includes('always')) {
        memory.learnedPreferences = {
          ...memory.learnedPreferences,
          lastPreferenceExtracted: prompt,
          updatedAt: new Date().toISOString()
        };
        await AgentExecutionContextHelper.saveMemory(this.metadata.id, memory);
      }

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
      await AgentExecutionContextHelper.recordExecution(
        this.metadata.id,
        prompt,
        e.message || String(e),
        false,
        durationMs
      );
      return AgentResultHelper.failure(this.metadata.id, e.message || String(e), durationMs);
    }
  }
}

// Register the agent dynamically with the central registry
globalAgentRegistry.register(new RecruiterAgent());
