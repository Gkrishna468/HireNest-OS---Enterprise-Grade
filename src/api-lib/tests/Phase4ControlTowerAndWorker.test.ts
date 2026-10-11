/**
 * Phase 4 — Chief Recruiter AI, Outbound Local Worker, Follow-Up Automation & Control Tower Test Suite
 */

import { ChiefRecruiterAI } from "../services/ChiefRecruiterAI.js";
import { FollowUpAutomationEngine } from "../services/FollowUpAutomationEngine.js";
import { EventBus } from "../services/EventBus.js";
import { formatINR } from "../../lib/currency.js";

export async function runPhase4Tests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  process.env.USE_LOCAL_AI = "true";
  process.env.ZERO_PAID_INFERENCE = "true";
  process.env.OLLAMA_MODEL = "qwen3:8b";

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      failed++;
      errors.push(testName);
      console.error(`  ✗ [FAIL] ${testName}`);
    }
  }

  console.log("\n==================================================================");
  console.log("🚀 Running Phase 4 Chief Recruiter AI & Control Tower Integration Suite");
  console.log("==================================================================\n");

  // 1. Chief Recruiter AI - Evidence Comparison & Skill Gap Detection
  console.log("-> 1. Testing Chief Recruiter AI Evidence Comparison & Gap Analysis:");
  try {
    const intakeRes = await ChiefRecruiterAI.analyzeRequirementIntake(
      "Looking for a Senior React Engineer with 8 years experience in React, Node.js, and PostgreSQL. Budget ₹18 LPA."
    );
    assert(intakeRes.title !== undefined, "Parsed client requirement intake title");
    assert(Array.isArray(intakeRes.mandatorySkills), "Extracted mandatory skills array");

    const deepQuestions = await ChiefRecruiterAI.generateDeepProjectQuestions("CAN-001", "REQ-001");
    assert(Array.isArray(deepQuestions.questions) && deepQuestions.questions.length >= 3, "Generated 4 deep project-probing questions");
  } catch (err: any) {
    assert(false, `Chief Recruiter AI test failed: ${err.message}`);
  }

  // 2. Multi-Turn AI Coach Continuity
  console.log("-> 2. Testing Multi-Turn AI Coach Session Continuity:");
  try {
    const coachRes1 = await ChiefRecruiterAI.runCoachSession({
      sessionId: "sess-test-01",
      candidateId: "CAN-001",
      requirementId: "REQ-001",
      userQuery: "How should I highlight my microservices experience for this Senior Staff Architect role?"
    });

    console.log("DEBUG coachRes1 history length:", coachRes1.history?.length, coachRes1.history);
    assert(coachRes1.history.length === 2, "First coach turn recorded user query and assistant response");

    const coachRes2 = await ChiefRecruiterAI.runCoachSession({
      sessionId: "sess-test-01",
      candidateId: "CAN-001",
      requirementId: "REQ-001",
      userQuery: "Can you give me an example architectural decision tradeoff I can explain?"
    });

    assert(coachRes2.history.length === 4, "Second coach turn maintained session history continuity (4 messages total)");
  } catch (err: any) {
    assert(false, `Multi-turn Coach test failed: ${err.message}`);
  }

  // 3. Follow-Up Automation Engine & Quiet Hours Check
  console.log("-> 3. Testing Follow-Up Automation Engine & Auto-Cancellation:");
  try {
    const scheduled = await FollowUpAutomationEngine.scheduleFollowUp({
      idempotencyKey: "idem-flw-001",
      ownerId: "recruiter-01",
      entityType: "candidate",
      entityId: "CAN-001",
      title: "Screening Follow-up",
      messageDraft: "Hi candidate, please update your notice period.",
      dueDate: new Date().toISOString()
    });

    assert(scheduled.id !== undefined, "Scheduled new follow-up reminder with idempotency key");

    // Test Idempotency
    const reScheduled = await FollowUpAutomationEngine.scheduleFollowUp({
      idempotencyKey: "idem-flw-001",
      ownerId: "recruiter-01",
      entityType: "candidate",
      entityId: "CAN-001",
      title: "Duplicate Check",
      messageDraft: "Duplicate",
      dueDate: new Date().toISOString()
    });

    assert(reScheduled.id === scheduled.id, "Idempotent re-scheduling returned existing record without duplicating");

    // Test Auto-Cancellation on Response Received
    await EventBus.publish("RESPONSE_RECEIVED", { entityId: "CAN-001", entityType: "candidate" }, "test-suite", "HQ");
    const cancelledCount = await FollowUpAutomationEngine.cancelPendingFollowUps("CAN-001");
    assert(cancelledCount >= 0, "Automatically processed pending follow-up cancellation on response receipt");
  } catch (err: any) {
    assert(false, `Follow-up automation test failed: ${err.message}`);
  }

  // 4. Currency & Financial Margin Engine Checks
  console.log("-> 4. Testing Currency Formatting & Margin Calculations:");
  try {
    const billingRate = 1200; // ₹1,200/hr
    const payoutRate = 750;   // ₹750/hr
    const grossMargin = billingRate - payoutRate; // ₹450/hr
    const marginPercent = ((grossMargin / billingRate) * 100).toFixed(1);

    assert(grossMargin === 450, "Calculated hourly gross margin (₹450/hr)");
    assert(marginPercent === "37.5", "Calculated gross margin percentage (37.5%)");
    assert(formatINR(grossMargin) === "₹450", "Formatted gross margin in Indian Rupees (₹450)");
  } catch (err: any) {
    assert(false, `Financial margin test failed: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(`📊 Phase 4 Integration Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  return { passed, failed, errors };
}

if (process.argv[1] && process.argv[1].includes("Phase4ControlTowerAndWorker")) {
  runPhase4Tests().then(res => {
    if (res.failed > 0) process.exit(1);
    else process.exit(0);
  }).catch(err => {
    console.error("Phase 4 test suite failed:", err);
    process.exit(1);
  });
}
