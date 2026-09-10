/**
 * HireNestOS - Candidate Canonicalization Test Suite
 * Evaluates deduplication, canonical identity resolution, completeness scoring,
 * and duplicate preservation.
 */

import {
  dedupeCandidates,
  candidateIdentityKeys,
  normalizeEmail,
  normalizePhone,
  normalizeName,
  isSyntheticCandidate,
} from "../services/candidateCanonicalizationService.js";

export function runCandidateCanonicalizationTests(): { passed: number; failed: number; errors: string[] } {
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

  console.log("\n=== RUNNING CANDIDATE CANONICALIZATION SUITE ===");

  // 1. Normalization & Identity Keys
  assert(
    normalizeEmail("  Srinivasa.Gorrepati@Gmail.Com ") === "srinivasa.gorrepati@gmail.com",
    "Email normalization trims and lowercases"
  );
  assert(
    normalizeEmail("unknown@example.com") === "",
    "Email normalization rejects placeholder example emails"
  );
  assert(
    normalizePhone("+1 (415) 555-2671") === "14155552671",
    "Phone normalization strips non-digits"
  );
  assert(
    normalizePhone("123") === "",
    "Phone normalization rejects invalid short numbers (< 7 digits)"
  );

  // 2. Synthetic Candidate Detection
  assert(
    isSyntheticCandidate({ name: "CAND_P6D_FAIL_123" }) === true,
    "Synthetic candidate prefix CAND_P6D_FAIL detected"
  );
  assert(
    isSyntheticCandidate({ name: "Needs Manual Review" }) === true,
    "Needs Manual Review placeholder detected"
  );
  assert(
    isSyntheticCandidate({ status: "DELETED", name: "Real Person" }) === true,
    "Deleted candidate detected"
  );
  assert(
    isSyntheticCandidate({ fullName: "Srinivasa Rao Gorrepati", skills: ["Java", "AWS"] }) === false,
    "Valid candidate is not marked synthetic"
  );

  // 3. Identity Keys Generation
  const keys = candidateIdentityKeys({
    fullName: "Srinivasa Rao Gorrepati",
    primaryEmail: "srinivasa.gorrepati@gmail.com",
    primaryPhone: "+1 (415) 555-2671",
    resumeHash: "hash_abc12345",
  });
  assert(
    keys.includes("email:srinivasa.gorrepati@gmail.com"),
    "Identity keys include normalized email"
  );
  assert(
    keys.includes("phone:14155552671"),
    "Identity keys include normalized phone"
  );
  assert(
    keys.includes("resume_hash:hash_abc12345"),
    "Identity keys include resume hash"
  );

  // 4. Duplicate Canonical Resolution
  const duplicates = [
    {
      id: "HN-CAN-001",
      candidateId: "HN-CAN-001",
      fullName: "Srinivasa Rao Gorrepati",
      primaryEmail: "srinivasa.gorrepati@gmail.com",
      primaryPhone: "14155552671",
      skills: ["Java", "Spring Boot"],
      resumeUrl: "https://storage.googleapis.com/resume1.pdf",
      updatedAt: "2026-03-01T10:00:00Z"
    },
    {
      id: "HN-CAN-002",
      candidateId: "HN-CAN-002",
      fullName: "Srinivasa Gorrepati",
      primaryEmail: "srinivasa.gorrepati@gmail.com",
      primaryPhone: "14155552671",
      skills: ["Java", "Spring Boot", "Microservices", "AWS"],
      resumeUrl: "https://storage.googleapis.com/resume2.pdf",
      experienceYears: 12,
      updatedAt: "2026-03-05T12:00:00Z"
    },
    {
      id: "HN-CAN-003",
      candidateId: "HN-CAN-003",
      fullName: "Srinivasa R Gorrepati",
      email: "srinivasa.gorrepati@gmail.com",
      phone: "+1 415 555 2671",
      skills: ["AWS", "Kafka", "Docker"],
      updatedAt: "2026-03-02T10:00:00Z"
    }
  ];

  const deduped = dedupeCandidates(duplicates);
  assert(deduped.length === 1, "Deduplicates 3 duplicates into exactly 1 canonical candidate card");
  
  const canonical: any = deduped[0];
  assert(
    canonical.primaryEmail === "srinivasa.gorrepati@gmail.com",
    "Canonical candidate preserves primary email"
  );
  assert(
    canonical.canonical === true,
    "Canonical candidate is marked canonical"
  );
  assert(
    canonical.duplicateRecordsMergedCount === 2,
    "Tracks merged count accurately"
  );
  assert(
    Array.isArray(canonical.skills) && canonical.skills.includes("AWS") && canonical.skills.includes("Kafka") && canonical.skills.includes("Java"),
    "Unifies skills across duplicate records onto canonical card"
  );
  assert(
    Array.isArray(canonical.allLinkedCandidateIds) && canonical.allLinkedCandidateIds.length === 3,
    "Tracks all 3 linked candidate IDs"
  );
  assert(
    Array.isArray(canonical.resumeVersions) && canonical.resumeVersions.length === 2,
    "Attaches multiple resume versions without data loss"
  );

  // 5. Anti-Pattern: DO NOT merge distinct candidates by name alone
  const distinctCandidates = [
    {
      id: "HN-CAN-101",
      fullName: "John Smith",
      primaryEmail: "john.smith.ny@gmail.com",
      primaryPhone: "12125551111",
      skills: ["Python", "Django"],
    },
    {
      id: "HN-CAN-102",
      fullName: "John Smith",
      primaryEmail: "john.smith.sf@gmail.com",
      primaryPhone: "14155552222",
      skills: ["React", "TypeScript"],
    }
  ];

  const distinctDeduped = dedupeCandidates(distinctCandidates);
  assert(
    distinctDeduped.length === 2,
    "DOES NOT merge two distinct candidates with same name but different contact info"
  );

  return { passed, failed, errors };
}

// Auto-run if executed directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runCandidateCanonicalizationTests();
  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  if (results.failed > 0) {
    process.exit(1);
  }
}
