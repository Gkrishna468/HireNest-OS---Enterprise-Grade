import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError } from "../types";

export interface CandidateEntity {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  directEmail?: string;
  phone?: string;
  directPhone?: string;
  primarySkills: string[];
  totalExperienceYears?: number;
  currentLocation?: string;
  expectedCtc?: number;
  currentCtc?: number;
  noticePeriodDays?: number;
  resumeUrl?: string;
  rawParsedText?: string;
  ownershipVendorId?: string;
  vendorId?: string;
  ownershipExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

const memoryCandidates = new Map<string, CandidateEntity>();

function cleanData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export class Candidate360Service {
  /**
   * Retrieves Candidate 360 profile with strict vendor privacy
   */
  static async getCandidate360(ctx: HireNestAccessContext, candidateId: string): Promise<CandidateEntity> {
    enforceCoreAccess(ctx, "candidate360.read");

    let data = memoryCandidates.get(candidateId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "candidatePool", candidateId));
        if (snap.exists()) {
          data = { ...(snap.data() as CandidateEntity), id: snap.id };
        }
      } catch (e) {}
    }

    if (!data) {
      throw new CoreResourceNotFoundError("Candidate", candidateId);
    }

    return Candidate360Service.redactCandidateForViewer(ctx, { ...data, id: candidateId });
  }

  static getCandidate = Candidate360Service.getCandidate360;

  /**
   * Applies Candidate 360 privacy masking based on viewer context and ownership boundaries
   */
  static redactCandidateForViewer<T extends { email?: string; directEmail?: string; phone?: string; directPhone?: string; ownershipVendorId?: string; vendorId?: string }>(
    ctx: HireNestAccessContext,
    candidate: T
  ): T {
    if (ctx.role === "VENDOR_RECRUITER" || ctx.role === "VENDOR_ADMIN") {
      const callerVendor = ctx.vendorId || ctx.organizationId;
      const ownerVendor = candidate.ownershipVendorId || candidate.vendorId;
      if (ownerVendor && ownerVendor !== callerVendor) {
        return {
          ...candidate,
          email: "[PROTECTED_VENDOR_DATA]",
          directEmail: "[PROTECTED_VENDOR_DATA]",
          phone: "[PROTECTED_VENDOR_DATA]",
          directPhone: "[PROTECTED_VENDOR_DATA]",
        };
      }
    }
    return candidate;
  }

  static async registerOrUpdateCandidate(
    ctx: HireNestAccessContext,
    payload: Partial<CandidateEntity> & { name?: string; directEmail?: string; directPhone?: string }
  ): Promise<CandidateEntity> {
    enforceCoreAccess(ctx, "candidates.create");
    const id = payload.id || `CAND-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const vendorId = ctx.role.startsWith("VENDOR_") ? (ctx.vendorId || ctx.organizationId) : payload.ownershipVendorId;

    const entity: CandidateEntity = {
      id,
      fullName: payload.fullName || payload.name || "Candidate",
      name: payload.fullName || payload.name || "Candidate",
      email: payload.email || payload.directEmail || "",
      directEmail: payload.directEmail || payload.email || "",
      phone: payload.phone || payload.directPhone,
      directPhone: payload.directPhone || payload.phone,
      primarySkills: payload.primarySkills || [],
      totalExperienceYears: payload.totalExperienceYears || 0,
      currentLocation: payload.currentLocation || "Remote",
      expectedCtc: payload.expectedCtc,
      currentCtc: payload.currentCtc,
      noticePeriodDays: payload.noticePeriodDays,
      resumeUrl: payload.resumeUrl,
      rawParsedText: payload.rawParsedText,
      ownershipVendorId: vendorId,
      vendorId,
      ownershipExpiresAt: payload.ownershipExpiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: payload.createdAt || now,
      updatedAt: now,
    };

    memoryCandidates.set(id, entity);

    try {
      await setDoc(doc(db, "candidatePool", id), cleanData(entity), { merge: true });
    } catch (e) {}

    return entity;
  }

  static createCandidate = Candidate360Service.registerOrUpdateCandidate;
}
