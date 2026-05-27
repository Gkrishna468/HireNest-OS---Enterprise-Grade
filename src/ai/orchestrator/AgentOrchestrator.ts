import { globalSkillRegistry } from './SkillRegistry';
import { SkillResult, SkillContext } from '../skills/types';
import { ZodError } from 'zod';

export class AgentOrchestrator {
  /**
   * Orchestrates the execution of a single skill by resolving it from the registry,
   * injecting context (memory, vendor isolation parameters, etc), and handling tracing/errors.
   * Enforces rigorous MCP tool contract validation for inputs and outputs.
   */
  async executeSkill<TInput, TOutput>(
    skillId: string, 
    rawInput: unknown, 
    context?: SkillContext
  ): Promise<SkillResult<TOutput>> {
    const skill = globalSkillRegistry.getSkill(skillId);
    
    if (!skill) {
      return { 
        success: false, 
        error: `AgentOrchestrator: Skill '${skillId}' could not be found in the SkillRegistry.` 
      };
    }
    
    const startTime = Date.now();
    const tenantId = context?.tenantId || 'system';
    const taskId = context?.taskId || 'sync';
    const timeoutMs = context?.timeoutMs || 30000; // 30s default timeout ceiling
    
    try {
      console.log(`[Orchestrator][${tenantId}][${taskId}] Executing Cognitive Skill: [${skill.name}] (ID: ${skill.id})`);
      
      // Strict Input Validation & Coercion (MCP Standard)
      const validatedInput = skill.inputSchema.parse(rawInput);
      
      // Execution ceiling wrapper
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Skill execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      
      // Execute the stateless skill logic with Promise.race for timeout protection
      const result = await Promise.race([
        skill.execute(validatedInput, context),
        timeoutPromise
      ]);
      
      // Strict Output Validation (Ensures downstream safety)
      if (result.success && result.data !== undefined) {
          result.data = skill.outputSchema.parse(result.data);
      }
      
      const executionTime = Date.now() - startTime;
      
      // Execution Telemetry Log
      console.log(`[Telemetry][SUCCESS] Skill: ${skillId} | Tenant: ${tenantId} | Task: ${taskId} | Time: ${executionTime}ms`);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTimeMs: executionTime
        }
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      let errorMessage = error.message || 'Unknown cognitive execution failure.';
      if (error instanceof ZodError) {
          errorMessage = `Contract Validation Failed: ${error.errors.map(e => e.message).join(', ')}`;
      }
      
      console.error(`[Telemetry][FAILED] Skill: ${skillId} | Tenant: ${tenantId} | Task: ${taskId} | Error: ${errorMessage} | Time: ${executionTime}ms`);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          executionTimeMs: executionTime
        }
      };
    }
  }

  // Future expansion: 
  // async executeWorkflow(workflowId: string, pipelineData: any) { ... }
}

export const aiOrchestrator = new AgentOrchestrator();
