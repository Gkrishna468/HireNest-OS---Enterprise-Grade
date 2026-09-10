/**
 * HireNestOS - Golden-Candidate Regression Test Suite
 * Evaluates CandidateMatchingService.computeFitmentEvaluation across 12 diverse,
 * grounded real-world candidate and JD scenarios with strict invariant assertions.
 * 
 * Verifies:
 * 1. 3-Concept Separation: Fitment (%), Evidence Confidence (%), Recruiter Validation items
 * 2. Strict JD Quality Gate: Incomplete JDs are BLOCKED, never hallucinated
 * 3. Deterministic Source Reconstruction: Only heals from genuine raw text
 * 4. Semantic Distinction: UNKNOWN != CONFIRMED_GAP != HARD_GATE_FAIL
 * 5. 8-Dimension Weighted Scoring Matrix (Skills 30%, Arch 20%, Exp 15%, Role 10%, Scale 10%, Mode/Geo 5%, Avail 5%, Comp 5%)
 */

import { CandidateMatchingService } from "../services/CandidateMatchingService.js";

export function runGoldenCandidateMatrixTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      errors.push(`${testName}${detail ? ` (${detail})` : ""}`);
      console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ""}`);
    }
  }

  console.log("\n===============================================================");
  console.log("   GOLDEN-CANDIDATE FITMENT ENGINE REGRESSION MATRIX (v2.0)");
  console.log("===============================================================");

  // SCENARIO 1: Target Microsoft Fabric Solution Architect (Strong Match Profile)
  {
    console.log("-> Scenario 1: Microsoft Fabric Solution Architect (Target Strong Match)");
    const candidate = {
      id: "CAND-GOLDEN-001",
      candidateName: "Sanjay Verma",
      totalExperience: 12.5,
      currentRole: "Lead Data Architect",
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake", "Azure Synapse", "Power BI", "DAX", "SQL", "Data Pipelines"],
      parsedResumeText: "12.5 years of experience in enterprise data architecture. Expertise in Microsoft Fabric Lakehouse, Direct Lake semantic models, OneLake, Azure Synapse, Power BI DAX. Led capacity management across workspaces.",
      preferredWorkMode: "Remote",
      location: "Dallas, TX",
      noticePeriod: "30 Days",
      expectedSalary: "$165,000/yr"
    };

    const requirement = {
      id: "REQ-GOLDEN-001",
      title: "Senior Microsoft Fabric Solution Architect",
      minExperience: 10,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake", "Data Pipelines", "Power BI"],
      mandatorySkills: ["Microsoft Fabric", "Lakehouse", "Direct Lake"],
      workMode: "Remote",
      location: "Remote"
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirement);
    assert(result.score >= 88 && result.score <= 95, `Scenario 1 Score within 88-95% range (got ${result.score}%)`);
    assert(result.tier === "STRONG", `Scenario 1 Tier is STRONG (got ${result.tier})`);
    assert(result.evidenceConfidence >= 80, `Scenario 1 Evidence Confidence is >= 80% (got ${result.evidenceConfidence}%)`);
    assert(result.validationRequired.length > 0, `Scenario 1 Has actionable recruiter validation items (${result.validationRequired.length})`);
    assert(result.gaps.length === 0, `Scenario 1 Has zero confirmed mandatory gaps (got ${result.gaps.length})`);
    assert(result.explainability !== undefined, "Scenario 1 Explainability object populated");
  }

  // SCENARIO 2: Experience Hard Gate Failure (Tenure Gap)
  {
    console.log("-> Scenario 2: Junior Engineer vs Principal Requirement (Hard Gate Failure)");
    const candidate = {
      id: "CAND-GOLDEN-002",
      candidateName: "Aarav Patel",
      totalExperience: 3,
      currentRole: "Junior Data Engineer",
      skills: ["Microsoft Fabric", "Power BI", "SQL", "Python"],
      parsedResumeText: "3 years experience building Power BI dashboards and basic Fabric lakehouse pipelines.",
      preferredWorkMode: "Remote",
      location: "Chicago, IL"
    };

    const requirement = {
      id: "REQ-GOLDEN-002",
      title: "Principal Fabric Data Architect",
      minExperience: 10,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake"],
      mandatorySkills: ["Microsoft Fabric", "Direct Lake"],
      workMode: "Remote"
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirement);
    assert(result.hardGateVerdict === "FAIL", `Scenario 2 Hard Gate Verdict is FAIL (got ${result.hardGateVerdict})`);
    assert(result.tier === "HARD_GATE_FAIL", `Scenario 2 Tier is HARD_GATE_FAIL (got ${result.tier})`);
    assert(result.score <= 50, `Scenario 2 Score capped at 50% due to hard gate (got ${result.score}%)`);
  }

  // SCENARIO 3: Cross-Domain Tech Stack (DevOps/SRE applied to Fabric Role)
  {
    console.log("-> Scenario 3: Cloud DevOps/SRE Engineer applied to Fabric Data Role (Core Skill Gap)");
    const candidate = {
      id: "CAND-GOLDEN-003",
      candidateName: "Elena Rostova",
      totalExperience: 11,
      currentRole: "Staff DevOps Engineer",
      skills: ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD", "Prometheus", "Golang", "Linux"],
      parsedResumeText: "11 years experience in infrastructure automation, EKS clusters, Terraform modules, container orchestration.",
      preferredWorkMode: "Remote",
      location: "Austin, TX"
    };

    const requirement = {
      id: "REQ-GOLDEN-003",
      title: "Microsoft Fabric Solution Architect",
      minExperience: 8,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake", "Data Pipelines"],
      mandatorySkills: ["Microsoft Fabric", "OneLake"],
      workMode: "Remote"
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirement);
    assert(result.score < 65, `Scenario 3 Score correctly reflects cross-domain gap (got ${result.score}%)`);
    assert(result.tier === "GAP", `Scenario 3 Classified as GAP tier (got ${result.tier})`);
    assert(result.gaps.length >= 1, `Scenario 3 Identifies confirmed mandatory skill gaps (${result.gaps.join(", ")})`);
  }

  // SCENARIO 4: Full-Stack Web Developer (Zero Domain Overlap)
  {
    console.log("-> Scenario 4: Full-Stack React/Node Developer applied to Data Architect Role");
    const candidate = {
      id: "CAND-GOLDEN-004",
      candidateName: "Marcus Vance",
      totalExperience: 8,
      currentRole: "Senior Frontend Engineer",
      skills: ["React", "TypeScript", "Node.js", "GraphQL", "Tailwind CSS", "Next.js"],
      parsedResumeText: "8 years developing responsive web applications, design systems, and frontend state architectures.",
      preferredWorkMode: "Remote"
    };

    const requirement = {
      id: "REQ-GOLDEN-004",
      title: "Enterprise Data Warehouse Architect",
      minExperience: 7,
      skills: ["Snowflake", "dbt", "Airflow", "SQL", "Data Modeling"],
      mandatorySkills: ["Snowflake", "dbt"],
      workMode: "Remote"
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirement);
    assert(result.score < 55, `Scenario 4 Score is < 55% for zero overlap (got ${result.score}%)`);
    assert(result.tier === "GAP", `Scenario 4 Tier is GAP (got ${result.tier})`);
  }

  // SCENARIO 5: Incomplete JD Quality Gate Interception (Placeholder Detected)
  {
    console.log("-> Scenario 5: Incomplete JD Quality Gate (Placeholder Strings Block Matching)");
    const candidate = {
      id: "CAND-GOLDEN-005",
      candidateName: "Devin White",
      totalExperience: 9,
      skills: ["Python", "SQL", "Spark"]
    };

    const requirementWithPlaceholders = {
      id: "REQ-GOLDEN-005",
      title: "Data Specialist",
      skills: ["Processing Pending: will update competencies shortly"],
      description: "Processing Pending"
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirementWithPlaceholders);
    assert(result.tier === "BLOCKED", `Scenario 5 Match is BLOCKED by quality gate (got ${result.tier})`);
    assert(result.score === 0, `Scenario 5 Score is 0 when blocked (got ${result.score})`);
    assert(result.blockedReason !== undefined, `Scenario 5 Blocked reason populated: "${result.blockedReason}"`);
    assert(result.explainability?.title === "Fitment Blocked", "Scenario 5 Explainability reflects blocked state");
  }

  // SCENARIO 6: JD Quality Gate Source Reconstruction from Raw Text
  {
    console.log("-> Scenario 6: JD Auto-Healed via Deterministic Source Reconstruction");
    const candidate = {
      id: "CAND-GOLDEN-006",
      candidateName: "Sophia Lin",
      totalExperience: 10,
      skills: ["Snowflake", "dbt", "Airflow", "Python", "SQL", "Data Modeling"],
      parsedResumeText: "10 years building modern data stack solutions using Snowflake, dbt models, Airflow orchestrations, and SQL data marts."
    };

    // JD has empty skills array, but rich raw text that allows source reconstruction
    const requirementRawText = {
      id: "REQ-GOLDEN-006",
      title: "Senior Snowflake Data Architect",
      skills: [], // Empty extracted skills
      description: "We are seeking a Senior Snowflake Data Architect with 8+ years of experience. Must have hands-on expertise with Snowflake, dbt, Apache Airflow, SQL, and data warehouse modeling."
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirementRawText);
    assert(result.tier !== "BLOCKED", `Scenario 6 Self-healed JD is not blocked (got ${result.tier})`);
    assert(result.score >= 75, `Scenario 6 Correctly scores candidate on reconstructed competencies (got ${result.score}%)`);
    assert(result.skillsOverlap.length >= 3, `Scenario 6 Successfully overlapped reconstructed skills (${result.skillsOverlap.join(", ")})`);
  }

  // SCENARIO 7: Senior Snowflake / dbt Architect (Strong Match)
  {
    console.log("-> Scenario 7: Senior Snowflake / dbt Architect (Target Strong Match)");
    const candidate = {
      id: "CAND-GOLDEN-007",
      candidateName: "Rohan Kulkarni",
      totalExperience: 11,
      currentRole: "Lead Data Warehouse Architect",
      skills: ["Snowflake", "dbt", "Airflow", "SQL", "Python", "Data Modeling"],
      parsedResumeText: "11 years architecting petabyte-scale data platforms using Snowflake, dbt, Apache Airflow, and Medallion architecture.",
      preferredWorkMode: "Hybrid",
      location: "New York, NY",
      noticePeriod: "Immediate",
      expectedSalary: "$175,000/yr"
    };

    const requirement = {
      id: "REQ-GOLDEN-007",
      title: "Lead Snowflake Architect",
      minExperience: 9,
      skills: ["Snowflake", "dbt", "Airflow", "SQL", "Python"],
      mandatorySkills: ["Snowflake", "dbt"],
      workMode: "Hybrid",
      location: "New York, NY"
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirement);
    assert(result.score >= 85 && result.score <= 95, `Scenario 7 Score within 85-95% range (got ${result.score}%)`);
    assert(result.tier === "STRONG", `Scenario 7 Tier is STRONG (got ${result.tier})`);
    assert(result.evidence.availabilityScore === 95, `Scenario 7 Immediate notice scored at 95% (got ${result.evidence.availabilityScore}%)`);
  }

  // SCENARIO 8: Semantic Distinction: UNKNOWN != CONFIRMED_GAP
  {
    console.log("-> Scenario 8: Semantic Distinction: Unstated Attributes (Neutral Baseline)");
    const candidateUnstated = {
      id: "CAND-GOLDEN-008",
      candidateName: "Chloe Dupont",
      totalExperience: 12,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake", "Data Pipelines", "SQL"],
      parsedResumeText: "12 years data architecture experience with Microsoft Fabric and OneLake.",
      // Notice: NO notice period and NO compensation provided in resume
      noticePeriod: "",
      expectedSalary: ""
    };

    const requirement = {
      id: "REQ-GOLDEN-008",
      title: "Microsoft Fabric Solution Architect",
      minExperience: 10,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake"],
      mandatorySkills: ["Microsoft Fabric", "OneLake"]
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidateUnstated, requirement);
    assert(result.tier === "STRONG", `Scenario 8 Candidate remains STRONG despite unstated comp/notice (got ${result.tier})`);
    assert(result.evidence.compensation === "— Not stated", "Scenario 8 Compensation marked as '— Not stated'");
    assert(result.explainability?.neutralUnknowns.some(u => u.toLowerCase().includes("compensation")), "Scenario 8 Neutral unknowns include compensation baseline");
    assert(!result.gaps.some(g => g.toLowerCase().includes("compensation")), "Scenario 8 Compensation is NOT counted in confirmed gaps");
  }

  // SCENARIO 9: Scale & Volume Explicit Proof
  {
    console.log("-> Scenario 9: Explicit 1,000+ Multi-Database Scale Proof");
    const candidateWithScale = {
      id: "CAND-GOLDEN-009",
      candidateName: "Vikram Mehta",
      totalExperience: 13,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake", "Data Pipelines", "SQL"],
      parsedResumeText: "Managed multi-database migration for 1,000+ enterprise databases into Microsoft Fabric OneLake with petabyte scale datasets.",
      preferredWorkMode: "Remote"
    };

    const requirement = {
      id: "REQ-GOLDEN-009",
      title: "Principal Fabric Data Architect",
      minExperience: 10,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake"]
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidateWithScale, requirement);
    assert(result.evidence.scaleScore === 90, `Scenario 9 Scale score is 90% for explicit scale proof (got ${result.evidence.scaleScore}%)`);
  }

  // SCENARIO 10: Scale Gap as Screening Item (Not Disqualifying)
  {
    console.log("-> Scenario 10: Scale Gap Treated as Screening Item rather than Failure");
    const candidateWithoutScale = {
      id: "CAND-GOLDEN-010",
      candidateName: "Amara Okonkwo",
      totalExperience: 12,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake", "Data Pipelines", "SQL"],
      parsedResumeText: "Architected enterprise Fabric Lakehouse solutions and automated data pipelines.",
      preferredWorkMode: "Remote"
    };

    const requirement = {
      id: "REQ-GOLDEN-010",
      title: "Principal Fabric Data Architect",
      minExperience: 10,
      skills: ["Microsoft Fabric", "OneLake", "Lakehouse", "Direct Lake"]
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidateWithoutScale, requirement);
    assert(result.evidence.scaleScore === 50, `Scenario 10 Scale score is neutral 50% baseline (got ${result.evidence.scaleScore}%)`);
    assert(result.score >= 85, `Scenario 10 Overall score remains >= 85% because scale is 10% weight (got ${result.score}%)`);
    assert(result.validationRequired.some(v => v.includes("1,000+")), "Scenario 10 Validation checklist guides recruiter to screen on 1,000+ scale");
  }

  // SCENARIO 11: Missing Mandatory Skill Hard Gap
  {
    console.log("-> Scenario 11: Missing Mandatory Skill Confirmed Gap");
    const candidate = {
      id: "CAND-GOLDEN-011",
      candidateName: "Liam O'Connor",
      totalExperience: 10,
      skills: ["Power BI", "SQL", "Azure Data Factory"],
      parsedResumeText: "10 years in BI reporting and Azure data pipelines."
    };

    const requirement = {
      id: "REQ-GOLDEN-011",
      title: "Fabric Architect",
      minExperience: 8,
      skills: ["Microsoft Fabric", "Direct Lake", "Power BI", "SQL"],
      mandatorySkills: ["Microsoft Fabric", "Direct Lake"]
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidate, requirement);
    assert(result.gaps.includes("Microsoft Fabric") || result.gaps.includes("Direct Lake"), `Scenario 11 Confirmed gaps contains missing mandatory skill (got ${result.gaps.join(", ")})`);
    assert(result.tier !== "STRONG", `Scenario 11 Candidate missing mandatory skill is not STRONG (got ${result.tier})`);
  }

  // SCENARIO 12: Work Mode & Location Compatibility Matching
  {
    console.log("-> Scenario 12: Work Mode Compatibility (On-site vs Remote)");
    const candidateRemoteOnly = {
      id: "CAND-GOLDEN-012",
      candidateName: "Yuki Tanaka",
      totalExperience: 10,
      skills: ["Snowflake", "SQL", "Python"],
      parsedResumeText: "10 years data warehouse engineer.",
      preferredWorkMode: "Remote",
      location: "San Francisco, CA"
    };

    const requirementHybrid = {
      id: "REQ-GOLDEN-012",
      title: "Data Warehouse Engineer",
      minExperience: 8,
      skills: ["Snowflake", "SQL"],
      workMode: "Hybrid",
      location: "Austin, TX"
    };

    const result = CandidateMatchingService.computeFitmentEvaluation(candidateRemoteOnly, requirementHybrid);
    assert(result.evidence.workModeScore !== undefined, "Scenario 12 Work mode scored");
    assert(result.evidence.locationScore !== undefined, "Scenario 12 Location scored");
    assert(result.evidence.workModeScore <= 100, "Scenario 12 Work mode score within bounds");
  }

  console.log("===============================================================");
  console.log(`GOLDEN-CANDIDATE MATRIX RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================");

  return { passed, failed, errors };
}
