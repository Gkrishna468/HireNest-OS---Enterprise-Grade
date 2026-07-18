/**
 * LAYER 2: COGNITIVE ENGINE (PERSONA REASONING)
 * 
 * Responsibility: Constructs multi-persona reasoning prompts (e.g. redteam, skeptic).
 * Calls the /api/reasoning/execute endpoint. 
 * Used by deep-think workflows that require structured intelligence rather than raw generation.
 */
// src/services/reasoningService.ts

export type ReasoningMode = 
  | 'founder' 
  | 'redteam' 
  | 'deepthink' 
  | 'blindspot' 
  | 'compress' 
  | 'missing' 
  | 'skeptic' 
  | 'firstprinciples' 
  | 'simulate' 
  | 'ghost';

export interface ReasoningContext {
  mode: ReasoningMode[];
  intent: string;
  payload: any;
  orgId?: string;
  uid?: string;
}

export interface ReasoningResponse {
  analysis: string;
  appliedModes: ReasoningMode[];
  confidence: number;
  suggestions?: string[];
  workflowTriggers?: string[];
}

export class ReasoningEngine {
  private static personae: Record<ReasoningMode, string> = {
    founder: "Adopt the persona of a visionary tech founder. Focus on growth, GTM strategy, product-market fit, and long-term moat creation. Be bold, strategic, and concise.",
    redteam: "Adopt the persona of a security researcher and adversarial thinker. Challenge assumptions, find vulnerabilities in logic or infrastructure, and focus on abuse prevention and security hardening.",
    deepthink: "Perform an exhaustive, first-principles logic sweep. Break down complex problems into their fundamental components. Do not rely on conventional wisdom.",
    blindspot: "Identify what is NOT being said. Find the hidden risks, missing context, and information gaps that could derail the project.",
    compress: "High-output, low-latency communication. Strip all fluff. Focus only on actionable directives and primary constraints.",
    missing: "Specifically look for missing pieces in a workflow, architecture, or plan. What's the 'missing middle'?",
    skeptic: "Critically evaluate every claim. Look for 'too good to be true' signals and verify all underlying data points.",
    firstprinciples: "Ignore existing implementations. Re-derive the solution from the ground up based on fundamental truths of the domain (staffing, tech, finance).",
    simulate: "Run a mental simulation of the proposed plan. Predict potential points of failure and edge-case behavior in production environments.",
    ghost: "Generate high-fidelity, native-sounding content. Adopt a specific voice that sounds human, professional, and distinctive."
  };

  /**
   * Automatically detects the best reasoning modes based on intent
   */
  static detectModes(intent: string): ReasoningMode[] {
    const modes: ReasoningMode[] = [];
    const lower = intent.toLowerCase();

    if (lower.includes('security') || lower.includes('hacking') || lower.includes('abuse') || lower.includes('vuln')) {
      modes.push('redteam', 'skeptic');
    }
    if (lower.includes('strategy') || lower.includes('gtm') || lower.includes('market') || lower.includes('roadmap')) {
      modes.push('founder');
    }
    if (lower.includes('complex') || lower.includes('architecture') || lower.includes('design')) {
      modes.push('deepthink', 'firstprinciples');
    }
    if (lower.includes('audit') || lower.includes('review') || lower.includes('missing')) {
      modes.push('blindspot', 'missing');
    }
    if (lower.includes('pitch') || lower.includes('post') || lower.includes('thread')) {
      modes.push('ghost', 'compress');
    }
    if (lower.includes('test') || lower.includes('predict') || lower.includes('simulate')) {
      modes.push('simulate');
    }

    // Default to deepthink if nothing detected
    if (modes.length === 0) modes.push('deepthink');
    
    return [...new Set(modes)];
  }

  static getInstructionSet(modes: ReasoningMode[]): string {
    return modes.map(m => this.personae[m]).join("\n\n");
  }

  static async execute(context: ReasoningContext): Promise<ReasoningResponse> {
    const appliedModes = context.mode.length > 0 ? context.mode : this.detectModes(context.intent);
    const instructions = this.getInstructionSet(appliedModes);

    try {
      const response = await fetch("/api/reasoning/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: context.intent,
          payload: context.payload,
          instructions,
          modes: appliedModes,
          context: { orgId: context.orgId, uid: context.uid }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Reasoning Engine unreachable: ${response.status} - ${text.substring(0, 100)}`);
      }
      
      try {
        return await response.json();
      } catch (parseErr: any) {
        const raw = await response.text();
        console.error("[REASONING] Manifest Parse Failure:", raw);
        throw new Error(`Malformed Intelligence Packet: ${parseErr.message}`);
      }
    } catch (e: any) {
      console.error("[REASONING_ERROR]", e);
      return {
        analysis: `Reasoning Node Offline: ${e.message}`,
        appliedModes,
        confidence: 0
      };
    }
  }
}
