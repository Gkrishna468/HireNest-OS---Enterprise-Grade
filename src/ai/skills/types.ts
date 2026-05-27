export interface SkillResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    tokensUsed?: number;
    model?: string;
    [key: string]: any;
  };
}

export interface AISkill<TInput = any, TOutput = any, TContext = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  
  execute(input: TInput, context?: TContext): Promise<SkillResult<TOutput>>;
}
