import { defineAgent } from "@livekit/agents";
import { RealtimeAIInterviewAgent } from "./agent.js";

const agent = defineAgent({
  entry: async (ctx) => {
    // 1. Establish the native connection context
    await ctx.connect();
    
    // 2. Extrapolate session ID from the connected room's name
    const sessionId = ctx.room.name!;
    console.log(`[AgentEntry] Managed Agent activated. Connected to LiveKit Room / Session: ${sessionId}`);

    // 3. Spawns our real-time interview evaluation and transcribing media loop
    const realtimeAgent = new RealtimeAIInterviewAgent(ctx, sessionId);
    
    // 4. Run the media loop
    try {
      await realtimeAgent.startAgentLoop();
    } catch (err: any) {
      console.error(`[AgentEntry] Session ${sessionId} encountered runtime error:`, err.message);
    }
  }
});

export default agent;
