import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";

describe("HireNest Technical Team Registration & Agent Dispatch Alignment", () => {
  it("should verify agent worker index.ts registers agentName as hirenest-technical-team", () => {
    const indexContent = fs.readFileSync("services/ai-interviewer/src/index.ts", "utf-8");
    assert.ok(indexContent.includes('agentName: HIRENEST_TECHNICAL_TEAM') || indexContent.includes('agentName: "hirenest-technical-team"'), "agentName must be set in ServerOptions");
    assert.ok(indexContent.includes('hirenest-technical-team'), "agentName string hirenest-technical-team must be present");
    assert.ok(indexContent.includes('requestFunc'), "requestFunc callback must be configured for job acceptance");
  });

  it("should verify candidate-screen.ts dispatches to agentName hirenest-technical-team with metadata", () => {
    const screenContent = fs.readFileSync("src/api-lib/handlers/candidate-screen.ts", "utf-8");
    assert.ok(screenContent.includes('"hirenest-technical-team"'), "Backend must dispatch to hirenest-technical-team");
    assert.ok(screenContent.includes("submissionId"), "Dispatch metadata must contain submissionId");
  });

  it("should verify candidate UI CandidateAIInterviewView.tsx uses HireNest Technical Team branding and identity check", () => {
    const viewContent = fs.readFileSync("src/views/CandidateAIInterviewView.tsx", "utf-8");
    assert.ok(viewContent.includes("HireNest Technical Team"), "UI must display HireNest Technical Team");
    assert.ok(viewContent.includes("hirenest-technical-team"), "UI must check for hirenest-technical-team participant identity");
    assert.ok(viewContent.includes("connectionTimedOut"), "UI must handle connection timeout state");
  });

  it("should verify agent.ts implements track deduplication with processedTrackSids", () => {
    const agentContent = fs.readFileSync("services/ai-interviewer/src/agent.ts", "utf-8");
    assert.ok(agentContent.includes("processedTrackSids"), "agent.ts must contain processedTrackSids set for track deduplication");
    assert.ok(agentContent.includes("AUDIO_TRACK_DUPLICATE_SKIPPED"), "agent.ts must log duplicate track skip event");
  });
});
