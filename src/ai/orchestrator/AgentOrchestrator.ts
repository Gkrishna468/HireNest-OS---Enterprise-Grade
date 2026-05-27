import { globalSkillRegistry } from './SkillRegistry';
import { SkillResult } from '../skills/types';

export class AgentOrchestrator {
  /**
   * Orchestrates the execution of a single skill by resolving it from the registry,
   * injecting context (memory, vendor isolation parameters, etc), and handling tracing/errors.
   */
  async executeSkill<TInput, TOutput>(
    skillId: string, 
    input: TInput, 
    context?: any
  ): Promise<SkillResult<TOutput>> {
    const skill = globalSkillRegistry.getSkill(skillId);
    
    if (!skill) {
      return { 
        success: false, 
        error: `AgentOrchestrator: Skill '${skillId}' could not be found in the SkillRegistry.` 
      };
    }
    
    const startTime = Date.now();
    try {
      console.log(`[Orchestrator] Executing Cognitive Skill: [${skill.name}] (ID: ${skill.id})`);
      
      // Execute the skill logic
      const result = await skill.execute(input, context);
      
      const executionTime = Date.now() - startTime;
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTimeMs: executionTime
        }
      };
    } catch (error: any) {
      console.error(`[Orchestrator] Error executing sequence '${skillId}':`, error);
      return {
        success: false,
        error: error.message || 'Unknown cognitive execution failure.',
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }

  // Future expansion: 
  // async executeWorkflow(workflowId: string, pipelineData: any) { ... }
}

export const aiOrchestrator = new AgentOrchestrator();
