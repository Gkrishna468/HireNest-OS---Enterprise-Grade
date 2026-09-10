/**
 * HireNestOS Canonical Candidate Identity Resolution Service
 * 
 * CORE PRINCIPLE: One person = one canonical `candidatePool` identity.
 * Different resumes, uploads, submissions, vendor relationships, match records,
 * and resume versions attach to that canonical candidate.
 * 
 * Resolution Order:
 * 1. Canonical candidate ID (if explicitly set or linked)
 * 2. Exact Normalized Email match
 * 3. Exact Normalized Phone match (>= 7 digits)
 * 4. Exact Resume SHA-256 / Content Hash
 * 5. Strong Compound Identity (Normalized Full Name + Phone OR Normalized Full Name + Email)
 * 
 * STRICT CONSTRAINT: NEVER merge by Name alone.
 */

export interface CandidateIdentityKeys {
  canonicalId?: string;
  normalizedEmail?: string;
  normalizedPhone?: string;
  resumeHash?: string;
  identityKeys: string[];
}

/**
 * Normalizes email address by trimming, lowercasing, and rejecting synthetic placeholders.
 */
export function normalizeEmail(rawEmail?: string | null): string {
  if (!rawEmail || typeof rawEmail !== "string") return "";
  const cleaned = rawEmail.trim().toLowerCase();
  if (
    !cleaned ||
    cleaned.includes("noemail") ||
    cleaned.includes("no-email") ||
    cleaned.includes("unknown@") ||
    cleaned.includes("placeholder") ||
    cleaned.includes(".local") ||
    cleaned.endsWith("@example.com") ||
    !cleaned.includes("@")
  ) {
    return "";
  }
  return cleaned;
}

/**
 * Normalizes phone number by extracting pure digits (minimum 7 digits required).
 */
export function normalizePhone(rawPhone?: string | null): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 7 || digits === "0000000000" || digits === "1234567890") {
    return "";
  }
  return digits;
}

/**
 * Normalizes candidate full name (collapses whitespace, lowercases, removes special chars).
 */
export function normalizeName(rawName?: string | null): string {
  if (!rawName || typeof rawName !== "string") return "";
  return rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detects placeholder or synthetic/failed candidate records.
 */
export function isSyntheticCandidate(candidate: any): boolean {
  if (!candidate) return true;
  const id = String(candidate.id || candidate.candidateId || "").toUpperCase();
  const name = String(candidate.fullName || candidate.name || "").toUpperCase();
  const status = String(candidate.status || "").toUpperCase();
  const distillationStatus = String(candidate.distillationStatus || "").toUpperCase();

  if (candidate.isActive === false || candidate.isDeleted === true || status === "DELETED") {
    return true;
  }

  if (
    id.startsWith("CAND_P6D_FAIL") ||
    name.startsWith("CAND_P6D_FAIL") ||
    name.includes("MISSING SKILL") ||
    name.includes("NEEDS MANUAL REVIEW") ||
    name.includes("PARSING PENDING") ||
    name.includes("LOCAL MOCK GENERATED") ||
    name.includes("PENDING DISTILLATION") ||
    name.includes("CANDIDATE WITH SKILL") ||
    name.includes("UNNAMED CANDIDATE") ||
    name.includes("UNKNOWN CANDIDATE") ||
    status === "PARSING_PENDING"
  ) {
    return true;
  }

  // Pure failed distillation with no usable name and no skills
  if (
    distillationStatus === "FAILED" &&
    (!candidate.skills || candidate.skills.length === 0) &&
    (!name || name === "UNKNOWN")
  ) {
    return true;
  }

  return false;
}

/**
 * Generates identity lookup keys for a candidate.
 * Returns array of unique namespaced tokens (e.g. ['email:user@domain.com', 'phone:14155552671', 'hash:abc1234'])
 */
export function candidateIdentityKeys(candidate: any): string[] {
  const keys: string[] = [];
  if (!candidate) return keys;

  const email = normalizeEmail(
    candidate.primaryEmail ||
    candidate.email ||
    candidate.parsedProfile?.email ||
    candidate.parsedProfile?.primaryEmail
  );
  if (email) {
    keys.push(`email:${email}`);
  }

  const phone = normalizePhone(
    candidate.primaryPhone ||
    candidate.phone ||
    candidate.phoneHash ||
    candidate.contactNumber ||
    candidate.parsedProfile?.phone ||
    candidate.parsedProfile?.primaryPhone
  );
  if (phone) {
    keys.push(`phone:${phone}`);
  }

  const resumeHash =
    candidate.resumeHash ||
    candidate.cvHash ||
    candidate.fileHash ||
    candidate.resumeFingerprint ||
    candidate.identityHash;
  if (resumeHash && typeof resumeHash === "string" && resumeHash.length >= 8) {
    keys.push(`resume_hash:${resumeHash.trim().toLowerCase()}`);
  }

  const normName = normalizeName(candidate.fullName || candidate.name);
  if (normName && normName.length >= 3) {
    // Strong compound identity (Name + Phone or Name + Email)
    if (email) {
      keys.push(`compound:${normName}|${email}`);
    }
    if (phone) {
      keys.push(`compound:${normName}|${phone}`);
    }
  }

  return keys;
}

/**
 * Calculates a profile completeness score to select the best canonical record among duplicates.
 */
export function calculateCandidateCompleteness(candidate: any): number {
  if (!candidate) return 0;
  let score = 0;

  // Canonical tag or explicit canonical ID
  if (candidate.canonical === true || candidate.isCanonical === true) score += 100;
  if (candidate.canonicalCandidateId && candidate.canonicalCandidateId === (candidate.candidateId || candidate.id)) {
    score += 50;
  }

  // Contact richness
  if (normalizeEmail(candidate.primaryEmail || candidate.email)) score += 20;
  if (normalizePhone(candidate.primaryPhone || candidate.phone)) score += 20;

  // Resume text & parsed profile richness
  if (candidate.resumeText && candidate.resumeText.length > 200) score += 30;
  if (candidate.parsedProfile || candidate.aiIntelligence) score += 20;

  // Skills richness
  const skillsCount = Array.isArray(candidate.skills) ? candidate.skills.length : 0;
  score += Math.min(30, skillsCount * 2);

  // Experience metadata
  if (candidate.experienceYears || candidate.totalExperience || candidate.experience) score += 10;
  if (candidate.currentRole || candidate.title || candidate.role) score += 10;

  // Resume file presence
  if (candidate.resumeUrl || candidate.resumeStoragePath) score += 15;

  // Recency bonus (updatedAt timestamp)
  const updated = candidate.updatedAt?.toMillis ? candidate.updatedAt.toMillis() : (candidate.updatedAt?.seconds ? candidate.updatedAt.seconds * 1000 : Date.parse(candidate.updatedAt) || 0);
  if (updated > 0) {
    score += Math.min(10, (updated / 100000000000));
  }

  return score;
}

/**
 * Deduplicates a list of candidate records into a single canonical set.
 * Groups records sharing verified identity keys (Email, Phone, Resume Hash, or Compound ID).
 * Merges versions and attachments onto the canonical record.
 */
export function dedupeCandidates<T = any>(candidates: T[]): T[] {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  // Filter out synthetic / deleted records first
  const validCandidates = candidates.filter((c) => !isSyntheticCandidate(c));
  if (validCandidates.length <= 1) return validCandidates;

  // Build Disjoint Set / Connected Components for identity resolution
  const parent = new Map<number, number>();
  const find = (i: number): number => {
    if (!parent.has(i)) parent.set(i, i);
    if (parent.get(i) !== i) {
      parent.set(i, find(parent.get(i)!));
    }
    return parent.get(i)!;
  };
  const union = (i: number, j: number) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent.set(rootI, rootJ);
    }
  };

  const keyToIndices = new Map<string, number[]>();

  validCandidates.forEach((candidate, idx) => {
    const keys = candidateIdentityKeys(candidate);
    keys.forEach((key) => {
      const existing = keyToIndices.get(key) || [];
      existing.push(idx);
      keyToIndices.set(key, existing);
    });
  });

  // Union all candidates that share at least one verified identity key
  keyToIndices.forEach((indices) => {
    if (indices.length > 1) {
      const first = indices[0];
      for (let i = 1; i < indices.length; i++) {
        union(first, indices[i]);
      }
    }
  });

  // Group candidates by their root canonical cluster
  const clusters = new Map<number, any[]>();
  validCandidates.forEach((candidate, idx) => {
    const root = find(idx);
    const group = clusters.get(root) || [];
    group.push(candidate);
    clusters.set(root, group);
  });

  const canonicalResults: any[] = [];

  clusters.forEach((group) => {
    if (group.length === 1) {
      canonicalResults.push(group[0]);
      return;
    }

    // Sort group by completeness score descending to elect the canonical winner
    group.sort((a, b) => calculateCandidateCompleteness(b) - calculateCandidateCompleteness(a));
    const winner = { ...group[0] };

    // Aggregate secondary IDs, resume versions, and skills across duplicate records
    const allIds = new Set<string>();
    const allSkills = new Set<string>(Array.isArray(winner.skills) ? winner.skills : []);
    const resumeVersions: any[] = Array.isArray(winner.resumeVersions) ? [...winner.resumeVersions] : [];

    group.forEach((item) => {
      const itemId = item.candidateId || item.id;
      if (itemId) allIds.add(itemId);

      if (Array.isArray(item.skills)) {
        item.skills.forEach((s: string) => {
          if (s && typeof s === "string") allSkills.add(s.trim());
        });
      }

      if (item.resumeUrl && !resumeVersions.some((rv) => rv.url === item.resumeUrl)) {
        resumeVersions.push({
          url: item.resumeUrl,
          fileName: item.resumeFileName || item.fileName || "resume.pdf",
          uploadedAt: item.createdAt || item.updatedAt || new Date().toISOString(),
          candidateId: itemId
        });
      }
    });

    winner.skills = Array.from(allSkills);
    winner.allLinkedCandidateIds = Array.from(allIds);
    winner.duplicateRecordsMergedCount = group.length - 1;
    winner.canonical = true;
    winner.canonicalCandidateId = winner.candidateId || winner.id;
    if (resumeVersions.length > 0) {
      winner.resumeVersions = resumeVersions;
    }

    canonicalResults.push(winner);
  });

  return canonicalResults as T[];
}
