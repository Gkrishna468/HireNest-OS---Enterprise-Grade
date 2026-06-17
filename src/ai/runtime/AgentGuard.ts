import { TemporalContext } from '../../temporal/config/temporalConfig';

export class AgentGuard {
  static readonly PROHIBITED_ACTIONS = [
    'REJECT_CANDIDATE',
    'DISPATCH_OFFER',
    'ALTER_BILLING',
    'TERMINATE_VENDOR'
  ];

  static canExecute(context: TemporalContext, actionName: string): boolean {
    const isAI = context.actorId.startsWith('system:ai-agent');
    
    if (isAI && this.PROHIBITED_ACTIONS.includes(actionName)) {
      console.warn(`[AgentGuard] BLOCKED: AI Agent ${context.actorId} attempted prohibited action: ${actionName}`);
      return false;
    }
    
    return true;
  }

  static assertSafeStateMutation(context: TemporalContext, actionName: string): void {
    if (!this.canExecute(context, actionName)) {
      throw new Error(`[AgentGuard] Security Exception: Action ${actionName} is strictly prohibited for AI actors.`);
    }
  }
}
