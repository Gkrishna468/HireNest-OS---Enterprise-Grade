/**
 * HireNestOS Local AI Migration & Zero Paid Inference Verification Test Suite
 * Validates complete local Ollama provider integration, $0 cost accounting,
 * zero paid fallback policy, document intelligence, matching, interview OS, and AI Operations.
 */

import { AIGateway } from "../services/AIGateway.js";
import { ResumeProcessingPipeline } from "../../resume-engine/pipeline/ResumeProcessingPipeline.js";
import { FitmentEngine } from "../../resume-engine/matching/fitment-engine.js";
import { AICOO } from "../services/AICOO.js";

export async function runLocalAIMigrationVerificationTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
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
  console.log("🚀 Running HireNest Local AI Migration & Zero-Paid Inference Suite");
  console.log("==================================================================\n");

  // 1. Ollama Local Provider Routing & $0 Cost Accounting
  console.log("-> 1. Testing Ollama Local Provider Registration & $0 Cost Accounting:");
  process.env.USE_LOCAL_AI = "true";
  process.env.ZERO_PAID_INFERENCE = "true";
  process.env.OLLAMA_MODEL = "qwen3:8b";

  try {
    const gatewayRes = await AIGateway.processChat({
      prompt: "Summarize top candidate qualifications for Senior DevOps Lead.",
      feature: "candidate_summaries",
      requireLocal: true,
      skipCache: true,
    });

    assert(gatewayRes.provider === "ollama" || gatewayRes.provider === "RuleEngine", "Routes task through Ollama / Local Rule Engine");
    assert(gatewayRes.estimatedCost === 0, "Estimated cost for local inference is strictly $0.00 / ₹0.00");
  } catch (err: any) {
    assert(false, `Ollama routing failed: ${err.message}`);
  }

  // 2. Strict Prohibition of Paid AI API Call When Local Offline / Disabled
  console.log("-> 2. Testing Zero Paid Fallback Isolation Policy:");
  process.env.DISABLE_PAID_AI_FALLBACK = "true";
  try {
    const gatewayRes = await AIGateway.processChat({
      prompt: "Extract key skills from document text.",
      feature: "skill_normalization",
      requireLocal: true,
      skipCache: true,
      fallbackRuleEngine: () => ({ skills: ["AWS", "Docker", "Kubernetes"], totalExperience: 8 }),
    });

    assert(gatewayRes.provider !== "google", "Paid Google GenAI provider was NOT invoked");
    assert(gatewayRes.estimatedCost === 0, "No paid inference costs incurred");
  } catch (err: any) {
    assert(false, `Zero paid fallback isolation failed: ${err.message}`);
  }

  // 3. Document Intelligence & Deterministic Extraction
  console.log("-> 3. Testing Document Intelligence & Evidence Validation:");
  const sampleDocText = `
    Rohan Verma
    Email: rohan.verma@techcloud.io | Phone: +91 98765 43210 | Location: Pune, India
    
    SUMMARY
    Senior Full Stack Engineer with 7 years of experience in React, Node.js, TypeScript, PostgreSQL, and AWS.

    EXPERIENCE
    TechCorp India - Senior Engineer (2020 - Present)
    - Built microservices in Node.js and React frontend handling 200k daily active users.
    
    EDUCATION
    B.Tech in Computer Science, 2017
  `;

  try {
    const pipelineRes = await ResumeProcessingPipeline.processResume({
      text: sampleDocText,
      filename: "Rohan_Verma_Resume.pdf",
      mimeType: "application/pdf",
      forceRescan: true,
    });

    assert(pipelineRes.success === true, "Resume processed through ingestion pipeline");
    assert(pipelineRes.candidateName === "Rohan Verma", "Extracted candidate name 'Rohan Verma'");
    assert(pipelineRes.skills.includes("React") && pipelineRes.skills.includes("Node.js"), "Extracted technical skills");
    assert(pipelineRes.experienceYears >= 6, `Calculated accurate experience (${pipelineRes.experienceYears} yrs)`);
  } catch (err: any) {
    assert(false, `Document ingestion failed: ${err.message}`);
  }

  // 4. Recruitment Matching & Hard Eligibility Rules
  console.log("-> 4. Testing Fitment Intelligence & Hard Eligibility Isolation:");
  const candidateProfile = {
    candidateName: "Rohan Verma",
    email: "rohan.verma@techcloud.io",
    totalExperience: 7,
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
    normalizedSkills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
    location: "Pune, India",
    noticePeriod: "Immediate",
  };

  const jobReq = {
    id: "REQ-FS-01",
    title: "Senior Full Stack Engineer",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    mandatorySkills: ["React", "Node.js"],
    minExperience: 5,
    location: "Pune, India",
    workMode: "Hybrid",
    maxNoticePeriodDays: 30,
  };

  const fitmentRes = FitmentEngine.evaluate(candidateProfile as any, jobReq);
  assert(fitmentRes.hardGatesPassed === true, "Candidate passes deterministic hard eligibility gates");
  assert(fitmentRes.fitmentScore >= 80, `Candidate scored ${fitmentRes.fitmentScore}% fitment score`);
  assert(fitmentRes.tier === "PRIMARY", "Classified in PRIMARY routing tier");

  // 5. AI Interview OS Question & Summary Generation via Local Gateway
  console.log("-> 5. Testing AI Interview OS Question & Summary Generation:");
  try {
    const interviewRes = await AIGateway.processChat({
      prompt: "Generate 3 technical screening questions for a React and Node.js developer.",
      feature: "interview_question_generation",
      requireLocal: true,
      skipCache: true,
    });

    assert(interviewRes !== null, "Generated AI Interview Questions via Local Gateway");
    assert(interviewRes.estimatedCost === 0, "Interview OS inference API cost is $0.00 / ₹0.00");
  } catch (err: any) {
    assert(false, `AI Interview question generation failed: ${err.message}`);
  }

  // 6. AI Operations & Enterprise Queue Review
  console.log("-> 6. Testing AI Operations & Enterprise Queue Review:");
  try {
    const cooRes = await AICOO.reviewEnterpriseQueues("ORG-GLOBAL-HQ");
    assert(cooRes !== undefined, "Executed AI COO Enterprise Queue Review");
    assert(typeof cooRes?.slaBreaches === "number", "Returned structured queue SLA metrics");
  } catch (err: any) {
    assert(false, `AI COO review failed: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(`📊 Local AI Verification Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  return { passed, failed, errors };
}

// Execute when run directly via tsx
if (import.meta.url.endsWith("LocalAIMigrationVerification.test.ts") || process.argv[1]?.includes("LocalAIMigrationVerification")) {
  runLocalAIMigrationVerificationTests()
    .then((res) => {
      if (res.failed > 0) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Test execution fatal error:", err);
      process.exit(1);
    });
}
