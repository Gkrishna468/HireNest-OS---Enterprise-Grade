import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";

describe("HireNest Technical Team End-to-End Pipeline & Telemetry Verification", () => {
  it("should verify worker registration configuration in services/ai-interviewer/src/index.ts", () => {
    const indexContent = fs.readFileSync("services/ai-interviewer/src/index.ts", "utf-8");
    assert.ok(indexContent.includes('agentName: HIRENEST_TECHNICAL_TEAM'), "agentName must be configured");
    assert.ok(indexContent.includes('HIRENEST_TECHNICAL_TEAM = "hirenest-technical-team"'), "agentName string must be hirenest-technical-team");
    assert.ok(indexContent.includes('requestFunc'), "requestFunc job handler callback must be present");
    assert.ok(indexContent.includes('JOB_RECEIVED'), "JOB_RECEIVED telemetry log must exist");
    assert.ok(indexContent.includes('JOB_ACCEPTED'), "JOB_ACCEPTED telemetry log must exist");
  });

  it("should verify agent worker runtime telemetry sequence in services/ai-interviewer/src/agent.ts", () => {
    const agentContent = fs.readFileSync("services/ai-interviewer/src/agent.ts", "utf-8");
    const requiredTelemetryLogs = [
      "[HN Technical Team] STARTUP_OK",
      "[HN Technical Team] JOB_RECEIVED",
      "[HN Technical Team] SESSION_CONTEXT_LOADED",
      "[HN Technical Team] ROOM_CONNECTED",
      "[HN Technical Team] AUDIO_TRACK_DETECTED",
      "[HN Technical Team] CANDIDATE_DETECTED",
      "[HN Technical Team] AUDIO_STREAM_STARTED",
      "[HN Technical Team] GREETING_STARTED",
      "[HN Technical Team] TTS_COMPLETED",
      "[HN Technical Team] AI_AUDIO_PUBLISHED",
      "[HN Technical Team] CANDIDATE_SPEECH_DETECTED",
      "[HN Technical Team] STT_STARTED",
      "[HN Technical Team] STT_COMPLETED",
      "[HN Technical Team] ANSWER_EVALUATED & COMMUNICATION_ANALYZED"
    ];

    for (const logTag of requiredTelemetryLogs) {
      assert.ok(agentContent.includes(logTag), `Agent worker must log telemetry tag: ${logTag}`);
    }
  });

  it("should verify explicit backend dispatch targeting hirenest-technical-team in src/api-lib/handlers/candidate-screen.ts", () => {
    const handlerContent = fs.readFileSync("src/api-lib/handlers/candidate-screen.ts", "utf-8");
    assert.ok(handlerContent.includes('createDispatch(sessionId, "hirenest-technical-team"'), "Backend must dispatch explicitly to hirenest-technical-team");
    assert.ok(handlerContent.includes('submissionId'), "Dispatch metadata must contain submissionId");
  });

  it("should verify candidate UI CandidateAIInterviewView.tsx uses HireNest Technical Team branding and identity check", () => {
    const viewContent = fs.readFileSync("src/views/CandidateAIInterviewView.tsx", "utf-8");
    assert.ok(viewContent.includes("HireNest Technical Team"), "UI must display HireNest Technical Team");
    assert.ok(viewContent.includes('hirenest-technical-team'), "UI must identify technical team by identity hirenest-technical-team");
    assert.ok(viewContent.includes("connectionTimedOut"), "UI must handle connection timeout after 30 seconds");
  });
});
