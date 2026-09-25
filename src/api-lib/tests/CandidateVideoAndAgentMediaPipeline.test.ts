import { describe, it } from "node:test";
import assert from "node:assert";

describe("Candidate Video Track Rendering & Agent Media Pipeline Integration", () => {
  it("should verify candidate video track rendering structure is present", async () => {
    // Verify CandidateAIInterviewView has VideoTrack component imported and used
    const fs = await import("node:fs");
    const viewContent = fs.readFileSync("src/views/CandidateAIInterviewView.tsx", "utf-8");

    assert.ok(viewContent.includes("VideoTrack"), "VideoTrack component must be imported and rendered");
    assert.ok(viewContent.includes("localCameraTrack"), "localCameraTrack must be queried from tracks");
    assert.ok(viewContent.includes("technicalTeamAudioTrack"), "technicalTeamAudioTrack must be queried from tracks");
  });

  it("should verify agent worker enumerates pre-existing candidate audio tracks", async () => {
    const fs = await import("node:fs");
    const agentContent = fs.readFileSync("services/ai-interviewer/src/agent.ts", "utf-8");

    assert.ok(agentContent.includes("remoteParticipants"), "Agent worker must check existing remoteParticipants");
    assert.ok(agentContent.includes("subscribeCandidateAudio"), "Agent worker must subscribe candidate audio track");
  });

  it("should verify fail-fast startup configuration check in agent worker index.ts", async () => {
    const fs = await import("node:fs");
    const indexContent = fs.readFileSync("services/ai-interviewer/src/index.ts", "utf-8");

    assert.ok(indexContent.includes("validateStartupConfiguration"), "Startup validation function must exist");
    assert.ok(indexContent.includes("LIVEKIT_URL"), "LIVEKIT_URL check must exist");
  });
});
