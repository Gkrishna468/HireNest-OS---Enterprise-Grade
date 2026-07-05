import { adminDb } from '../../lib/firebase-admin';
import { AgentMemory, AgentExecutionContext } from './types';

export class AgentExecutionContextHelper {
  /**
   * Loads persistence memory for a given agent from Firestore
   */
  static async loadMemory(agentId: string): Promise<AgentMemory> {
    const defaultMemory: AgentMemory = {
      previousExecutions: [],
      learnedPreferences: {},
      cachedContexts: {},
      customState: {},
    };

    if (!adminDb) {
      return defaultMemory;
    }

    try {
      const doc = await adminDb.collection('agents').doc(agentId).collection('memory').doc('state').get();
      if (doc.exists) {
        const data = doc.data();
        return {
          previousExecutions: data?.previousExecutions || [],
          learnedPreferences: data?.learnedPreferences || {},
          cachedContexts: data?.cachedContexts || {},
          customState: data?.customState || {},
        };
      }
    } catch (e) {
      console.warn(`[AgentExecutionContextHelper] Failed to load memory for ${agentId}:`, e);
    }

    return defaultMemory;
  }

  /**
   * Saves persistence memory for a given agent to Firestore
   */
  static async saveMemory(agentId: string, memory: AgentMemory): Promise<void> {
    if (!adminDb) return;

    try {
      await adminDb.collection('agents').doc(agentId).collection('memory').doc('state').set({
        ...memory,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn(`[AgentExecutionContextHelper] Failed to save memory for ${agentId}:`, e);
    }
  }

  /**
   * Appends execution trace, updates task counters, and maintains agent latency averages in Firestore
   */
  static async recordExecution(
    agentId: string,
    prompt: string,
    output: string,
    success: boolean,
    durationMs: number
  ): Promise<void> {
    if (!adminDb) return;

    try {
      // Append history item
      await adminDb.collection('agents').doc(agentId).collection('history').add({
        timestamp: new Date().toISOString(),
        prompt: prompt.substring(0, 1000), // guard against massive prompt payloads
        output: output.substring(0, 2000), // guard against massive responses
        success,
        durationMs,
      });

      // Update rolled-up execution metrics
      const statsRef = adminDb.collection('agents').doc(agentId).collection('metrics').doc('summary');
      const statsDoc = await statsRef.get();
      const currentStats = statsDoc.exists ? statsDoc.data() : { 
        totalTasks: 0, 
        successfulTasks: 0, 
        failedTasks: 0, 
        totalDurationMs: 0, 
        averageDurationMs: 0, 
        lastRun: '' 
      };

      const newTotal = (currentStats.totalTasks || 0) + 1;
      const newSuccess = (currentStats.successfulTasks || 0) + (success ? 1 : 0);
      const newFailed = (currentStats.failedTasks || 0) + (success ? 0 : 1);
      const newDuration = (currentStats.totalDurationMs || 0) + durationMs;

      await statsRef.set({
        totalTasks: newTotal,
        successfulTasks: newSuccess,
        failedTasks: newFailed,
        totalDurationMs: newDuration,
        averageDurationMs: Math.round(newDuration / newTotal),
        lastRun: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn(`[AgentExecutionContextHelper] Failed to record execution metrics for ${agentId}:`, e);
    }
  }
}
