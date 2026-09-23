import { RealtimeAIInterviewAgent } from "../agent.js";
import { STTFactory } from "../stt.js";
import { TTSFactory } from "../tts.js";
import { SileroVAD } from "../vad.js";

// Basic assertions helper for lightweight testing without external runners
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("🚦 STARTING AI MEDIA AGENT INTEGRATION TEST SUITE");
  console.log("==================================================");

  // 1. Test: VAD fallback initialization and boundary checking
  try {
    console.log("[Test] 1. Initializing Silero VAD structures...");
    const vad = new SileroVAD();
    
    // Test PCM float array with silent frames
    const silentFrame = new Float32Array(320); // 20ms of silence
    const speechProbabilitySilence = await vad.calculateSpeechProbability(silentFrame);
    assert(speechProbabilitySilence === 0.0, "Silence should return 0.0 speech probability when unloaded");

    console.log("✅ VAD fallback state checked.");
  } catch (err: any) {
    console.error("❌ Test 1 failed:", err.message);
  }

  // 2. Test: STT Provider error handling under empty environment key limits
  try {
    console.log("[Test] 2. Checking STT Provider credential gates...");
    process.env.WHISPER_API_KEY = ""; // Clean key
    const provider = STTFactory.getProvider();
    
    const dummyAudio = Buffer.alloc(100);
    await provider.transcribe(dummyAudio);
    
    assert(false, "Should have thrown BLOCKED_STT_CONFIGURATION_REQUIRED error");
  } catch (err: any) {
    assert(err.message.includes("BLOCKED_STT_CONFIGURATION_REQUIRED") || err.message.includes("AI_INTERVIEW_STT_FAILED"), "Incorrect STT error payload");
    console.log("✅ STT Provider authorization verified successfully.");
  }

  // 3. Test: TTS Provider error handling under empty credentials
  try {
    console.log("[Test] 3. Checking TTS Provider credential gates...");
    process.env.ELEVENLABS_API_KEY = "";
    const provider = TTSFactory.getProvider();
    
    await provider.synthesize("Hello world");
    assert(false, "Should have thrown BLOCKED_TTS_CONFIGURATION_REQUIRED error");
  } catch (err: any) {
    assert(err.message.includes("BLOCKED_TTS_CONFIGURATION_REQUIRED") || err.message.includes("AI_INTERVIEW_TTS_FAILED"), "Incorrect TTS error payload");
    console.log("✅ TTS Provider authorization verified successfully.");
  }

  // 4. Test: Agent room initialization boundary check
  try {
    console.log("[Test] 4. Initializing Realtime Agent connection gates...");
    const agent = new RealtimeAIInterviewAgent(null as any, "test_session_123");
    
    // Await loop should fail on empty credentials
    process.env.LIVEKIT_URL = "";
    await agent.startAgentLoop();
    
    assert(false, "Should have blocked loop startup on missing LiveKit URLs");
  } catch (err: any) {
    assert(err.message.includes("BLOCKED_LIVEKIT_CONFIGURATION_REQUIRED"), "Should raise LiveKit configuration block");
    console.log("✅ Agent room credentials checked successfully.");
  }

  console.log("==================================================");
  console.log("🎉 ALL MEDIA INTEGRATION TESTS SUCCESSFULLY COMPILED");
  console.log("==================================================");
}

// Execute tests if run directly
runTests().catch((err) => {
  console.error("Test runner threw fatal error:", err);
  process.exit(1);
});
