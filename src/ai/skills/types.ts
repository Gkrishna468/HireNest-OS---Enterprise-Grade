import { ZodType } from 'zod';

export interface SkillResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    tokensUsed?: number;
    estimatedCostUsd?: number;
    retries?: number;
    model?: string;
    [key: string]: any;
  };
}

export interface SkillContext {
  userId?: string;
  orgId?: string;
  role?: string;
  tenantId?: string; // Multi-tenant isolation boundary
  taskId?: string; // Async execution task id
  timeoutMs?: number; // Execution ceiling
  idempotencyKey?: string; // Duplicate prevention
}

export interface AISkill<TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  version: string;

  // Explicit MCP-style contracts
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  
  execute(input: TInput, context?: SkillContext): Promise<SkillResult<TOutput>>;
}
