import { db } from "../lib/firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";

/**
 * Candidate-facing Job Feed Item (Strictly Sanitized).
 * Exposes NO vendor information, NO client commercial terms, NO internal recruiter notes.
 */
export interface CandidateJobFeedItem {
  id: string;
  requirementId: string;
  title: string;
  role: string;
  location: string;
  employmentType: "FTE";
  workMode: "Onsite";
  experience: string;
  skills: string[];
  description: string;
  openings?: number;
  postedAt?: string;
  updatedAt?: string;
  directApplyEnabled: boolean;
  candidatePublish: boolean;
  status: "ACTIVE";
}

export type CandidateFacingStatus =
  | "Submitted"
  | "Screening"
  | "Shortlisted"
  | "Interview"
  | "Selected"
  | "Offer"
  | "Placed"
  | "Rejected"
  | "Withdrawn"
  | "Closed";

export interface CandidateStatusPipelineStep {
  key: CandidateFacingStatus;
  label: string;
  stepNumber: number;
  isComplete: boolean;
  isCurrent: boolean;
  isTerminal?: boolean;
  description: string;
}

export interface DirectCandidateInvite {
  id: string;
  token: string;
  requirementId: string;
  requirementTitle: string;
  createdByUserId: string;
  createdByRole: string;
  createdAt: string;
  expiresAt: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  clickCount?: number;
  applyCount?: number;
}

import { CandidateRequirementEligibilityPolicy } from "./CandidateRequirementEligibilityPolicy.js";

export class CandidateJobFeedService {
  /**
   * Evaluates if a raw requirement meets the strict Candidate-Facing criteria:
   * 1. Status = Active / Open
   * 2. Employment Type = FTE (Full-Time)
   * 3. Work Mode = Onsite
   * 4. Candidate Publish = TRUE (or not explicitly false for Active+FTE+Onsite)
   * 5. Direct Apply Enabled !== false
   * 
   * Authoritative delegate to CandidateRequirementEligibilityPolicy.
   */
  public static isRequirementCandidateEligible(rawReq: any): boolean {
    return CandidateRequirementEligibilityPolicy.isCandidateEligible(rawReq);
  }

  /**
   * Sanitizes a raw requirement into a clean Candidate-Facing Job Item.
   * Strips all internal CRM, vendor, client billing, and margin properties.
   */
  public static sanitizeForCandidate(rawReq: any): CandidateJobFeedItem {
    const rawSkills = rawReq.skills || rawReq.mandatorySkills || [];
    const skillsList = Array.isArray(rawSkills)
      ? rawSkills
      : typeof rawSkills === "string"
      ? rawSkills.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    return {
      id: rawReq.id || rawReq.requirementId || "",
      requirementId: rawReq.id || rawReq.requirementId || "",
      title: rawReq.title || rawReq.role || "Software Specialist",
      role: rawReq.role || rawReq.title || "Software Specialist",
      location: rawReq.location || "Onsite, India",
      employmentType: "FTE",
      workMode: "Onsite",
      experience: rawReq.experience || rawReq.minExperience || "3-6 Years",
      skills: skillsList,
      description: rawReq.description || rawReq.summary || "Full-time permanent position at client site.",
      openings: rawReq.openings ? Number(rawReq.openings) : 1,
      postedAt: rawReq.createdAt || rawReq.postedAt || new Date().toISOString(),
      updatedAt: rawReq.updatedAt || new Date().toISOString(),
      directApplyEnabled: rawReq.directApplyEnabled !== false,
      candidatePublish: rawReq.candidatePublish !== false && rawReq.candidate_publish !== false,
      status: "ACTIVE"
    };
  }

  /**
   * Fetches all candidate-eligible requirements (Active + FTE + Onsite + candidate_publish).
   */
  public static async getCandidateEligibleJobs(): Promise<CandidateJobFeedItem[]> {
    try {
      const qReqs = collection(db, "requirements_public");
      const snap = await getDocs(qReqs);
      const eligibleJobs: CandidateJobFeedItem[] = [];

      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() };
        if (this.isRequirementCandidateEligible(data)) {
          eligibleJobs.push(this.sanitizeForCandidate(data));
        }
      }

      return eligibleJobs;
    } catch (err) {
      console.error("[CandidateJobFeedService] Error fetching candidate jobs:", err);
      return [];
    }
  }

  /**
   * Real-time subscription to candidate-eligible requirements feed.
   */
  public static subscribeCandidateEligibleJobs(
    onJobsUpdated: (jobs: CandidateJobFeedItem[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const qReqs = collection(db, "requirements_public");
    return onSnapshot(
      qReqs,
      snap => {
        const eligible: CandidateJobFeedItem[] = [];
        snap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() };
          if (this.isRequirementCandidateEligible(data)) {
            eligible.push(this.sanitizeForCandidate(data));
          }
        });
        onJobsUpdated(eligible);
      },
      err => {
        console.warn("[CandidateJobFeedService] Subscription warning:", err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Generates a secure direct candidate application link / token.
   * Direct links allow an authorized HQ/recruiter to send a requirement directly
   * to a candidate, bypassing the public candidate feed filter.
   */
  public static async generateDirectCandidateInvite(params: {
    requirementId: string;
    requirementTitle: string;
    createdByUserId: string;
    createdByRole: string;
  }): Promise<{ token: string; inviteUrl: string; inviteDocId: string }> {
    const { requirementId, requirementTitle, createdByUserId, createdByRole } = params;

    // Generate secure random alphanumeric token
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    const token = `cand_${requirementId.substring(0, 8)}_${randomHex}`;

    // Token valid for 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const inviteData: DirectCandidateInvite = {
      id: token,
      token,
      requirementId,
      requirementTitle,
      createdByUserId,
      createdByRole,
      createdAt: new Date().toISOString(),
      expiresAt,
      status: "ACTIVE",
      clickCount: 0,
      applyCount: 0
    };

    await setDoc(doc(db, "candidate_requirement_invites", token), inviteData);

    const origin = typeof window !== "undefined" ? window.location.origin : "https://hirenestos.com";
    const inviteUrl = `${origin}/candidate/apply/${requirementId}/${token}`;

    return {
      token,
      inviteUrl,
      inviteDocId: token
    };
  }

  /**
   * Validates a direct candidate invite token and loads the requirement details.
   * Enforces cryptographic invite token verification:
   * - If requirement is public candidate-eligible, standard direct apply is permitted.
   * - If requirement is unlisted / restricted, a valid, active server-side invitation token matching the requirementId is strictly required.
   */
  public static async verifyDirectCandidateInvite(
    requirementId: string,
    token?: string
  ): Promise<{
    valid: boolean;
    job: CandidateJobFeedItem | null;
    errorReason?: string;
  }> {
    if (!requirementId) {
      return { valid: false, job: null, errorReason: "Invalid requirement ID." };
    }

    try {
      // 1. Fetch the requirement document
      const reqRef = doc(db, "requirements_public", requirementId);
      const reqSnap = await getDoc(reqRef);

      if (!reqSnap.exists()) {
        return { valid: false, job: null, errorReason: "Requirement not found or position has expired." };
      }

      const reqData = { id: reqSnap.id, ...reqSnap.data() } as any;

      // 2. Check if requirement is ACTIVE / OPEN
      const status = (reqData.status || "").toUpperCase();
      if (status === "CLOSED" || status === "ARCHIVED" || status === "EXPIRED" || status === "CANCELLED") {
        return { valid: false, job: null, errorReason: "This job opportunity has been closed or archived." };
      }

      const isPublicEligible = CandidateRequirementEligibilityPolicy.isCandidateEligible(reqData);

      // 3. If requirement is unlisted/restricted, an active direct invitation token is MANDATORY
      if (!isPublicEligible) {
        if (!token) {
          return {
            valid: false,
            job: null,
            errorReason: "Access Restricted: This private opportunity requires an authorized invitation token."
          };
        }

        const inviteRef = doc(db, "candidate_requirement_invites", token);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          return {
            valid: false,
            job: null,
            errorReason: "Invalid invitation token. The requested link does not exist."
          };
        }

        const invData = inviteSnap.data() as DirectCandidateInvite;

        // Anti-tamper verification: token must strictly correspond to this requirement ID
        if (invData.requirementId !== requirementId) {
          return {
            valid: false,
            job: null,
            errorReason: "Token authorization mismatch: This invitation token does not grant access to the specified requirement."
          };
        }

        // Status verification
        if (invData.status !== "ACTIVE") {
          return {
            valid: false,
            job: null,
            errorReason: `This invitation link is ${invData.status.toLowerCase()} and cannot be used.`
          };
        }

        // Expiry verification
        if (invData.expiresAt && new Date(invData.expiresAt).getTime() < Date.now()) {
          return {
            valid: false,
            job: null,
            errorReason: "This invitation link has expired. Please request a new link from your recruiter."
          };
        }

        // Increment click count asynchronously
        setDoc(
          inviteRef,
          { clickCount: (invData.clickCount || 0) + 1, lastClickedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      } else if (token) {
        // If public eligible AND token provided, still log click telemetry
        try {
          const inviteRef = doc(db, "candidate_requirement_invites", token);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists()) {
            const invData = inviteSnap.data() as DirectCandidateInvite;
            if (invData.requirementId === requirementId) {
              setDoc(
                inviteRef,
                { clickCount: (invData.clickCount || 0) + 1, lastClickedAt: new Date().toISOString() },
                { merge: true }
              ).catch(() => {});
            }
          }
        } catch (tokErr) {
          console.warn("[CandidateJobFeedService] Token check note:", tokErr);
        }
      }

      // 4. Sanitize and return requirement (never exposing client/vendor commercial terms)
      const sanitized = this.sanitizeForCandidate(reqData);
      return { valid: true, job: sanitized };
    } catch (err: any) {
      console.error("[CandidateJobFeedService] verifyDirectCandidateInvite error:", err);
      return { valid: false, job: null, errorReason: err.message || "Failed to load job details." };
    }
  }

  /**
   * Maps internal CRM / Submission statuses to clean, candidate-facing lifecycle stages:
   * 1. Submitted
   * 2. Screening
   * 3. Shortlisted
   * 4. Interview
   * 5. Selected
   * 6. Offer
   * 7. Placed
   * Terminal: Rejected, Withdrawn, Closed
   */
  public static mapInternalStatusToCandidateStatus(rawStatus?: string): {
    candidateStatus: CandidateFacingStatus;
    badgeColor: string;
    progressPercent: number;
    description: string;
    stageIndex: number;
  } {
    if (!rawStatus) {
      return {
        candidateStatus: "Submitted",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
        progressPercent: 15,
        description: "Your application has been received and queued for review.",
        stageIndex: 0
      };
    }

    const s = rawStatus.toUpperCase().replace(/\s+/g, "_");

    // Placed / Hired
    if (s.includes("PLACED") || s.includes("HIRED") || s.includes("ONBOARDED")) {
      return {
        candidateStatus: "Placed",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        progressPercent: 100,
        description: "Congratulations! You have been placed in this role.",
        stageIndex: 6
      };
    }

    // Offer
    if (s.includes("OFFER") || s.includes("OFFER_EXTENDED") || s.includes("OFFER_RELEASED") || s.includes("OFFER_ACCEPTED")) {
      return {
        candidateStatus: "Offer",
        badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
        progressPercent: 85,
        description: "An official offer has been released.",
        stageIndex: 5
      };
    }

    // Selected
    if (s.includes("SELECTED") || s.includes("CLIENT_SELECTED") || s.includes("FINAL_SELECT")) {
      return {
        candidateStatus: "Selected",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
        progressPercent: 70,
        description: "You have been selected following successful interviews.",
        stageIndex: 4
      };
    }

    // Interview
    if (s.includes("INTERVIEW") || s.includes("SCHEDULED") || s.includes("ROUND") || s.includes("L1") || s.includes("L2") || s.includes("TECH")) {
      return {
        candidateStatus: "Interview",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
        progressPercent: 55,
        description: "Technical or client interview round in progress.",
        stageIndex: 3
      };
    }

    // Shortlisted
    if (s.includes("SHORTLIST") || s.includes("CLIENT_SHORTLIST") || s.includes("MATCHED")) {
      return {
        candidateStatus: "Shortlisted",
        badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300",
        progressPercent: 40,
        description: "Your profile was shortlisted for hiring manager evaluation.",
        stageIndex: 2
      };
    }

    // Screening (AI Screening, Recruiter Review, Client Review, Sourcing, Under Review)
    if (
      s.includes("SCREEN") ||
      s.includes("REVIEW") ||
      s.includes("SOURCING") ||
      s.includes("EVALUATING") ||
      s.includes("VALIDAT") ||
      s.includes("IN_PROGRESS")
    ) {
      return {
        candidateStatus: "Screening",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        progressPercent: 25,
        description: "Profile is undergoing recruiter and skill verification.",
        stageIndex: 1
      };
    }

    // Terminal: Rejected
    if (s.includes("REJECT") || s.includes("DECLINED") || s.includes("DISQUALIF") || s.includes("NOT_SELECTED")) {
      return {
        candidateStatus: "Rejected",
        badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
        progressPercent: 100,
        description: "Application not moving forward for this position at this time.",
        stageIndex: -1
      };
    }

    // Terminal: Withdrawn
    if (s.includes("WITHDRAW")) {
      return {
        candidateStatus: "Withdrawn",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        progressPercent: 100,
        description: "Application was withdrawn by candidate.",
        stageIndex: -1
      };
    }

    // Terminal: Closed
    if (s.includes("CLOSED") || s.includes("POSITION_FILLED") || s.includes("EXPIRED")) {
      return {
        candidateStatus: "Closed",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        progressPercent: 100,
        description: "Position was closed by hiring manager.",
        stageIndex: -1
      };
    }

    // Default Submitted
    return {
      candidateStatus: "Submitted",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      progressPercent: 15,
      description: "Application received and logged in HireNest.",
      stageIndex: 0
    };
  }

  /**
   * Generates the standard 7-step candidate visual timeline.
   */
  public static getCandidateLifecyclePipeline(rawStatus?: string): CandidateStatusPipelineStep[] {
    const { candidateStatus, stageIndex } = this.mapInternalStatusToCandidateStatus(rawStatus);

    const steps: { key: CandidateFacingStatus; label: string }[] = [
      { key: "Submitted", label: "Submitted" },
      { key: "Screening", label: "Screening" },
      { key: "Shortlisted", label: "Shortlisted" },
      { key: "Interview", label: "Interview" },
      { key: "Selected", label: "Selected" },
      { key: "Offer", label: "Offer" },
      { key: "Placed", label: "Placed" }
    ];

    const isTerminal =
      candidateStatus === "Rejected" ||
      candidateStatus === "Withdrawn" ||
      candidateStatus === "Closed";

    const stepDescriptions: Record<string, string> = {
      Submitted: "Application received and logged in HireNest.",
      Screening: "Profile is undergoing recruiter and skill verification.",
      Shortlisted: "Your profile was shortlisted for hiring manager evaluation.",
      Interview: "Technical or client interview round in progress.",
      Selected: "You have been selected following successful interviews.",
      Offer: "An official offer has been released.",
      Placed: "Congratulations! You have been placed in this role."
    };

    return steps.map((s, idx) => {
      const isComplete = !isTerminal && idx < stageIndex;
      const isCurrent = !isTerminal && idx === stageIndex;
      return {
        key: s.key,
        label: s.label,
        stepNumber: idx + 1,
        isComplete,
        isCurrent,
        isTerminal,
        description: stepDescriptions[s.key] || "Under evaluation."
      };
    });
  }
}
