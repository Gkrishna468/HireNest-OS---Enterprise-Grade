import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError } from "../types.js";
import { RequirementService } from "./RequirementService.js";
import { SubmissionService } from "./SubmissionService.js";

export interface OfferEntity {
  id: string;
  submissionId: string;
  requirementId: string;
  candidateId: string;
  candidateName: string;
  vendorId: string;
  clientId: string;
  offeredAnnualCtc: number;
  currency: string;
  joiningDate: string;
  status: "OFFERED" | "ACCEPTED" | "DECLINED" | "RESCINDED";
  createdAt: string;
  updatedAt: string;
}

export interface PlacementEntity {
  id: string;
  offerId: string;
  submissionId: string;
  requirementId: string;
  candidateId: string;
  candidateName: string;
  vendorId: string;
  clientId: string;
  placementFee: number;
  currency: string;
  joinedDate: string;
  guaranteePeriodDays: number;
  status: "ACTIVE_JOINED" | "ATTRITED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
}

const memoryOffers = new Map<string, OfferEntity>();
const memoryPlacements = new Map<string, PlacementEntity>();

function cleanData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export class OfferService {
  static async extendOffer(
    ctx: HireNestAccessContext,
    payload: {
      submissionId: string;
      requirementId: string;
      candidateId: string;
      candidateName: string;
      vendorId: string;
      clientId: string;
      offeredAnnualCtc: number;
      currency?: string;
      joiningDate: string;
    }
  ): Promise<OfferEntity> {
    enforceCoreAccess(ctx, "offers.create");

    const id = `OFFER-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const entity: OfferEntity = {
      id,
      submissionId: payload.submissionId,
      requirementId: payload.requirementId,
      candidateId: payload.candidateId,
      candidateName: payload.candidateName,
      vendorId: payload.vendorId,
      clientId: payload.clientId,
      offeredAnnualCtc: payload.offeredAnnualCtc,
      currency: payload.currency || "INR",
      joiningDate: payload.joiningDate,
      status: "OFFERED",
      createdAt: now,
      updatedAt: now,
    };

    memoryOffers.set(id, entity);

    try {
      await setDoc(doc(db, "offers", id), cleanData(entity));
    } catch (e) {}

    await SubmissionService.advanceStage(ctx, payload.submissionId, "OFFER_EXTENDED");

    try {
      await RequirementService.updateFulfillmentStats(ctx, payload.requirementId, { offers: 1 });
    } catch (e) {}

    return entity;
  }
}

export class PlacementService {
  static async recordPlacement(
    ctx: HireNestAccessContext,
    payload: {
      offerId: string;
      submissionId: string;
      requirementId: string;
      candidateId: string;
      candidateName: string;
      vendorId: string;
      clientId: string;
      placementFee: number;
      currency?: string;
      joinedDate: string;
      guaranteePeriodDays?: number;
    }
  ): Promise<PlacementEntity> {
    enforceCoreAccess(ctx, "placements.create");

    const id = `PLACE-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const entity: PlacementEntity = {
      id,
      offerId: payload.offerId,
      submissionId: payload.submissionId,
      requirementId: payload.requirementId,
      candidateId: payload.candidateId,
      candidateName: payload.candidateName,
      vendorId: payload.vendorId,
      clientId: payload.clientId,
      placementFee: payload.placementFee,
      currency: payload.currency || "INR",
      joinedDate: payload.joinedDate,
      guaranteePeriodDays: payload.guaranteePeriodDays || 90,
      status: "ACTIVE_JOINED",
      createdAt: now,
      updatedAt: now,
    };

    memoryPlacements.set(id, entity);

    try {
      await setDoc(doc(db, "placements", id), cleanData(entity));
    } catch (e) {}

    await SubmissionService.advanceStage(ctx, payload.submissionId, "PLACED");

    try {
      await RequirementService.updateFulfillmentStats(ctx, payload.requirementId, { placements: 1 });
    } catch (e) {}

    return entity;
  }
}
