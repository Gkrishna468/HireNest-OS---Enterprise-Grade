import { ReactivationOpportunity, ReactivationSignalEvidence } from "../types";
import { AccessControlService, HireNestAccessContext } from "./accessControlService";

export interface ScanOptions {
  minOpportunityScore?: number;
  tenantId?: string;
  roleFilter?: 'RECRUITER' | 'VENDOR' | 'CLIENT' | 'ADMIN' | string;
  orgId?: string;
  accessContext?: HireNestAccessContext;
}

export class CandidateReactivationService {
  /**
   * Evaluates candidate & requirement pair against the 8-signal evidence model
   */
  public static evaluateOpportunity(
    candidate: any,
    job: any,
    historicalContext: {
      pastInterviews?: any[];
      pastSubmissions?: any[];
      ownershipExpired?: boolean;
    } = {}
  ): ReactivationOpportunity | null {
    if (!candidate || !job) return null;

    const candId = candidate.candidateId || candidate.id || "CAN-UNKNOWN";
    const reqId = job.requirementId || job.id || "REQ-UNKNOWN";
    const candName = candidate.fullName || candidate.name || "Candidate";
    const reqTitle = job.title || job.roleTitle || "Target Role";
    const clientName = job.clientName || job.client || "Client Partner";

    // Standardize skill arrays
    const candSkills: string[] = Array.isArray(candidate.skills)
      ? candidate.skills
      : typeof candidate.skills === "string"
      ? candidate.skills.split(",").map((s: string) => s.trim())
      : [];

    const jobSkills: string[] = Array.isArray(job.requiredSkills || job.skills)
      ? job.requiredSkills || job.skills
      : typeof (job.requiredSkills || job.skills) === "string"
      ? (job.requiredSkills || job.skills).split(",").map((s: string) => s.trim())
      : [];

    // Calculate direct skill overlap
    const matchedSkills = candSkills.filter((cs) =>
      jobSkills.some((js) => js.toLowerCase() === cs.toLowerCase())
    );
    const skillRatio = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0.5;
    const directMatchScore = Math.min(100, Math.round(skillRatio * 100));

    // Calculate dormant days
    const lastActive = candidate.lastActivityAt
      ? new Date(candidate.lastActivityAt).getTime()
      : candidate.createdAt
      ? new Date(candidate.createdAt).getTime()
      : Date.now() - 60 * 24 * 60 * 60 * 1000;

    const dormantDays = Math.max(1, Math.floor((Date.now() - lastActive) / (1000 * 60 * 60 * 24)));

    // 8-Signal Evidence Scoring
    const signals: ReactivationSignalEvidence[] = [];
    let signalScore = 0;

    // Signal 1: New Requirement Match (Weight: 25)
    const jobCreatedAt = job.createdAt ? new Date(job.createdAt).getTime() : Date.now();
    const isNewJob = (Date.now() - jobCreatedAt) / (1000 * 60 * 60 * 24) <= 14;
    if (isNewJob && directMatchScore >= 60) {
      signals.push({
        type: "NEW_REQUIREMENT_MATCH",
        weight: 25,
        description: `New active requirement "${reqTitle}" published recently matching ${matchedSkills.length} core skills.`
      });
      signalScore += 25;
    }

    // Signal 2: Inactivity Decay (Weight: 20)
    if (dormantDays >= 60) {
      signals.push({
        type: "INACTIVITY_DECAY",
        weight: 20,
        description: `Candidate dormant for ${dormantDays} days without active submission or contact.`
      });
      signalScore += 20;
    } else if (dormantDays >= 30) {
      signals.push({
        type: "INACTIVITY_DECAY",
        weight: 12,
        description: `Candidate dormant for ${dormantDays} days.`
      });
      signalScore += 12;
    }

    // Signal 3: Silver Medalist (Weight: 20)
    const isSilverMedalist =
      (historicalContext.pastInterviews && historicalContext.pastInterviews.length > 0) ||
      (candidate.pipelineStage && ["Interviewed", "Client Review", "Final Round"].includes(candidate.pipelineStage));

    if (isSilverMedalist) {
      signals.push({
        type: "SILVER_MEDALIST",
        weight: 20,
        description: `Validated candidate who previously progressed to interview/final stages.`
      });
      signalScore += 20;
    }

    // Signal 4: Notice Period / Availability (Weight: 10)
    const notice = (candidate.noticePeriod || candidate.availability || "").toLowerCase();
    const isAvailableSoon =
      notice.includes("immediate") ||
      notice.includes("15") ||
      notice.includes("30") ||
      notice.includes("available");

    if (isAvailableSoon) {
      signals.push({
        type: "NOTICE_PERIOD",
        weight: 10,
        description: `Candidate ready for deployment within short notice (${candidate.noticePeriod || 'Immediate / 30d'}).`
      });
      signalScore += 10;
    }

    // Signal 5: Compensation Realignment (Weight: 10)
    const candExpected = parseFloat(candidate.expectedSalary || candidate.ctc || "0");
    const jobMaxComp = parseFloat(job.maxBudget || job.maxSalary || job.budget || "99999999");
    if (candExpected > 0 && jobMaxComp > 0 && candExpected <= jobMaxComp) {
      signals.push({
        type: "COMP_REALIGNMENT",
        weight: 10,
        description: `Compensation expectation aligns perfectly with client's budget band.`
      });
      signalScore += 10;
    }

    // Signal 6: Dropped Stage Recovery (Weight: 5)
    if (candidate.status === "QUEUED" || candidate.pipelineStage === "Withdrawn") {
      signals.push({
        type: "DROPPED_STAGE",
        weight: 5,
        description: `Previously queued or withdrawn profile now available for fresh re-engagement.`
      });
      signalScore += 5;
    }

    // Signal 7: Exclusivity Expiry (Weight: 5)
    if (historicalContext.ownershipExpired) {
      signals.push({
        type: "EXCLUSIVITY_EXPIRY",
        weight: 5,
        description: `Vendor exclusivity window expired; candidate globally accessible.`
      });
      signalScore += 5;
    }

    // Signal 8: Skill Market Surge (Weight: 5)
    if (matchedSkills.length >= 3) {
      signals.push({
        type: "SKILL_SURGE",
        weight: 5,
        description: `Strong skill density: ${matchedSkills.slice(0, 4).join(", ")}.`
      });
      signalScore += 5;
    }

    // Combine Direct Match & Signal Evidence Score
    const opportunityScore = Math.min(100, Math.round(directMatchScore * 0.45 + signalScore * 0.55));

    // Reject low-opportunity signals (< 50)
    if (opportunityScore < 50) return null;

    // AI Drafted Message Grounded in Concrete Data
    const compText = job.budget || job.maxBudget ? `in the ${job.budget || job.maxBudget} range` : '';
    const skillsText = matchedSkills.length > 0 ? matchedSkills.slice(0, 3).join(", ") : candSkills.slice(0, 3).join(", ");

    const bodyText = `Hi ${candName.split(" ")[0]}, we recently received a new ${reqTitle} role with a client in ${clientName} ${compText}. Given your strong background in ${skillsText}, this appears to be a great fit for your next move. Would you be open to a quick discussion this week?`;

    const triggerType =
      signals.length > 2
        ? "MULTI_SIGNAL_COMPOSITE"
        : isSilverMedalist
        ? "SILVER_MEDALIST"
        : isNewJob
        ? "NEW_REQUIREMENT_MATCH"
        : "DORMANT_CANDIDATE";

    return {
      id: `ROPP-${candId}-${reqId}`,
      candidateId: candId,
      candidateName: candName,
      candidateEmail: candidate.primaryEmail || candidate.email || "",
      candidatePhone: candidate.phone || candidate.mobile || "",
      candidateSkills: candSkills,
      candidateNoticePeriod: candidate.noticePeriod || candidate.availability || "30 Days",
      candidateLocation: candidate.location || candidate.currentLocation || "Remote / Onsite",
      candidateExperience: candidate.experience || candidate.yearsOfExperience || 0,
      vendorId: candidate.vendorId || candidate.orgId,

      requirementId: reqId,
      requirementTitle: reqTitle,
      clientName: clientName,
      clientId: job.clientId,
      tenantId: candidate.tenantId || "DEFAULT",

      triggerType,
      triggerReason: `Converging evidence (${signals.length} signals): ${signals.map((s) => s.description).join(" | ")}`,

      opportunityScore,
      matchScore: directMatchScore,
      signals,

      matchExplanation: {
        strengths: matchedSkills.length > 0 ? [`Matching skills: ${matchedSkills.join(", ")}`] : ["Relevant domain experience"],
        gaps: candSkills.filter((s) => !matchedSkills.includes(s)).slice(0, 2).map((g) => `Secondary skill difference: ${g}`),
        recommendation: `High-value reactivation opportunity. Reach out via WhatsApp or Email.`
      },
      dormantDays,

      recommendedChannel: candidate.phone ? "WHATSAPP" : "EMAIL",
      messageDraft: {
        subject: `Opportunity: ${reqTitle} position at ${clientName}`,
        body: bodyText,
        roleTitle: reqTitle,
        clientIndustry: clientName,
        compRange: job.budget || job.maxBudget || "Market Standard"
      },

      consentStatus: candidate.consentStatus || "OPTED_IN",
      status: "PENDING_RECRUITER_REVIEW",

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Authoritatively scans candidates and jobs using HireNestAccessContext
   */
  public static async scanAuthorizedAll(
    candidates: any[],
    jobs: any[],
    context: HireNestAccessContext,
    minOpportunityScore: number = 50
  ): Promise<ReactivationOpportunity[]> {
    const opportunities: ReactivationOpportunity[] = [];
    const activeJobs = jobs.filter(
      (j) => !j.status || j.status === "ACTIVE" || j.status === "OPEN" || j.status === "APPROVED" || j.status === "PUBLISHED"
    );

    // Filter jobs accessible to context
    const authorizedJobs: any[] = [];
    for (const job of activeJobs) {
      const jobId = job.id || job.requirementId;
      if (jobId && await AccessControlService.canViewRequirement(context, jobId)) {
        authorizedJobs.push(job);
      }
    }

    if (authorizedJobs.length === 0) {
      return [];
    }

    // Filter candidates accessible to context
    for (const cand of candidates) {
      const candId = cand.id || cand.candidateId;
      if (!candId) continue;
      
      const canViewCand = await AccessControlService.canViewCandidate(context, candId, cand);
      if (!canViewCand) continue;

      for (const job of authorizedJobs) {
        const opp = this.evaluateOpportunity(cand, job);
        if (opp && opp.opportunityScore >= minOpportunityScore) {
          opportunities.push(opp);
        }
      }
    }

    return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  /**
   * Synchronous / Legacy scanner over candidate array and active requirement array
   */
  public static scanAll(
    candidates: any[],
    jobs: any[],
    options: ScanOptions = {}
  ): ReactivationOpportunity[] {
    const minScore = options.minOpportunityScore || 50;
    const opportunities: ReactivationOpportunity[] = [];

    const role = (options.accessContext?.role || options.roleFilter || "").toUpperCase();
    const orgId = options.accessContext?.organizationId || options.accessContext?.vendorId || options.accessContext?.clientId || options.orgId;

    const activeJobs = jobs.filter(
      (j) => !j.status || j.status === "ACTIVE" || j.status === "OPEN" || j.status === "APPROVED" || j.status === "PUBLISHED"
    );

    for (const cand of candidates) {
      // Role & Org Filtering via context or options
      if (role === "VENDOR" && orgId) {
        if (cand.vendorId && cand.vendorId !== orgId && cand.submittedByVendorId !== orgId) {
          continue;
        }
      }

      for (const job of activeJobs) {
        if (role === "CLIENT" && orgId && job.clientId !== orgId) {
          continue;
        }

        if (role === "VENDOR" && orgId) {
          if (Array.isArray(job.distributedVendorIds) && !job.distributedVendorIds.includes(orgId)) {
            continue;
          }
        }

        const opp = this.evaluateOpportunity(cand, job);
        if (opp && opp.opportunityScore >= minScore) {
          opportunities.push(opp);
        }
      }
    }

    // Sort by opportunityScore descending
    return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }
}
