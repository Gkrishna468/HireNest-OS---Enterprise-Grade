import { db, handleFirestoreError, OperationType } from "../lib/firebase.js";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  orderBy 
} from "firebase/firestore";
import { isTrustedServiceContext } from "../lib/trusted-context.server.js";
import { emitEvent } from "./eventBus.js";
import { 
  BusinessEventType, 
  BusinessValueEvent, 
  ROISummary, 
  ActorAttributionType, 
  CommercialStage 
} from "../types/roi.js";

/**
 * ROIEngine (HN-ROI Layer)
 * 
 * Provides first-class economic attribution and business value measurement.
 * Architectural Invariant:
 * Recruiter is an optional human actor. No synthetic, fake, or fallback recruiter identities
 * may ever be automatically generated or attributed.
 */
export class ROIEngine {
  private static instance: ROIEngine;
  private readonly collectionName = "business_value_ledger";

  private constructor() {}

  public static getInstance(): ROIEngine {
    if (!ROIEngine.instance) {
      ROIEngine.instance = new ROIEngine();
    }
    return ROIEngine.instance;
  }

  /**
   * Records a business milestone event into the immutable economic ledger
   */
  public async recordEvent(params: {
    tenantId: string;
    requirementId: string;
    eventType: BusinessEventType;
    stage: CommercialStage;
    actorType: "ADMIN" | "VENDOR" | "RECRUITER" | "CLIENT" | "SYSTEM";
    actorId: string;
    attributionType?: ActorAttributionType;
    recruiterId?: string | null;
    vendorId?: string | null;
    clientId?: string | null;
    candidateId?: string | null;
    agentTaskId?: string | null;
    stepId?: string | null;
    estimatedValue?: number;
    realizedValue?: number;
    currency?: "INR" | "USD";
    cost?: {
      aiCost?: number;
      humanReviewCost?: number;
      infrastructureCost?: number;
      totalCost?: number;
    };
    source?: string;
    metadata?: Record<string, any>;
  }): Promise<BusinessValueEvent> {
    // Deterministic event ID for agent tasks guarantees idempotent retry without duplicate events
    const eventId = params.agentTaskId 
      ? `bve-${params.agentTaskId}-${params.stepId || 'step'}-${params.eventType}${params.candidateId ? `-${params.candidateId}` : ''}`
      : `bve-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const aiCost = params.cost?.aiCost || 0;
    const humanReviewCost = params.recruiterId ? (params.cost?.humanReviewCost || 0) : 0;
    const infrastructureCost = params.cost?.infrastructureCost || 0;
    const totalCost = params.cost?.totalCost || (aiCost + humanReviewCost + infrastructureCost);

    const event: BusinessValueEvent = {
      businessEventId: eventId,
      tenantId: params.tenantId,
      requirementId: params.requirementId,
      candidateId: params.candidateId || null,
      agentTaskId: params.agentTaskId || null,
      stepId: params.stepId || null,
      actorType: params.actorType,
      actorId: params.actorId,
      attributionType: params.attributionType || (params.agentTaskId ? "AGENT_EXECUTED" : "MANUAL"),
      
      // Strict architectural invariant: Recruiter is null unless explicitly provided
      recruiterId: params.recruiterId || null,
      vendorId: params.vendorId || null,
      clientId: params.clientId || null,
      
      timestamp: now,
      eventType: params.eventType,
      stage: params.stage,
      estimatedValue: params.estimatedValue || 0,
      realizedValue: params.realizedValue || 0,
      currency: params.currency || "INR",
      cost: {
        aiCost,
        humanReviewCost,
        infrastructureCost,
        totalCost
      },
      source: params.source || "ROIEngine",
      metadata: params.metadata || {}
    };

    // Safe persistence with zero-trust handling (idempotent setDoc overwrites if already present)
    try {
      await setDoc(doc(db, this.collectionName, eventId), event);
    } catch (err: any) {
      if (isTrustedServiceContext()) {
        try {
          const { adminDb } = await import("../lib/firebase-admin.js");
          if (adminDb) {
            await adminDb.collection(this.collectionName).doc(eventId).set(event);
          }
        } catch (adminErr) {
          console.warn("[ROIEngine] Failed adminDb write fallback:", adminErr);
        }
      } else {
        handleFirestoreError(err, OperationType.WRITE, `${this.collectionName}/${eventId}`);
      }
    }

    // Emit to real-time event bus
    try {
      await emitEvent(
        params.eventType,
        "SYSTEM",
        eventId,
        params.actorId,
        params.actorType,
        {
          stage: params.stage,
          tenantId: params.tenantId,
          recruiterId: event.recruiterId,
          vendorId: event.vendorId,
          estimatedValue: event.estimatedValue,
          realizedValue: event.realizedValue,
          totalCost: event.cost.totalCost
        }
      );
    } catch (busErr) {
      console.warn("[ROIEngine] EventBus emission warning:", busErr);
    }

    return event;
  }

  /**
   * Calculates Agent Economic Efficiency (AEE)
   * Formula: Realized Gross Margin Attributed ÷ Total Agent Operating Cost
   * Handles edge cases cleanly:
   * - Operating cost <= 0: Returns null with INSUFFICIENT_COST_BASIS (never Infinity or NaN)
   * - Realized margin = 0: Returns 0.00
   * - Negative margin: Returns negative ratio without NaN
   */
  public calculateAEE(realizedGrossMargin: number, totalOperatingCost: number): {
    aee: number | null;
    status: "VALID" | "INSUFFICIENT_COST_BASIS" | "ZERO_MARGIN" | "NEGATIVE_MARGIN";
    reason?: string;
  } {
    if (totalOperatingCost <= 0) {
      return {
        aee: null,
        status: "INSUFFICIENT_COST_BASIS",
        reason: "Operating cost is zero or negative; AEE requires a positive cost basis."
      };
    }
    if (realizedGrossMargin === 0) {
      return { aee: 0.0, status: "ZERO_MARGIN" };
    }
    if (realizedGrossMargin < 0) {
      return { 
        aee: Number((realizedGrossMargin / totalOperatingCost).toFixed(2)), 
        status: "NEGATIVE_MARGIN" 
      };
    }
    return {
      aee: Number((realizedGrossMargin / totalOperatingCost).toFixed(2)),
      status: "VALID"
    };
  }

  public calculateAEENumber(realizedGrossMargin: number, totalOperatingCost: number): number | null {
    return this.calculateAEE(realizedGrossMargin, totalOperatingCost).aee;
  }

  /**
   * Generates aggregated ROI analytics across a tenant or entire system
   */
  public async getSummary(tenantId?: string): Promise<ROISummary> {
    const events: BusinessValueEvent[] = [];

    try {
      if (isTrustedServiceContext()) {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          let ref: any = adminDb.collection(this.collectionName);
          if (tenantId) ref = ref.where("tenantId", "==", tenantId);
          const snap = await ref.limit(500).get();
          snap.forEach((d: any) => events.push(d.data() as BusinessValueEvent));
        }
      } else {
        let q = query(collection(db, this.collectionName), limit(500));
        if (tenantId) {
          q = query(collection(db, this.collectionName), where("tenantId", "==", tenantId), limit(500));
        }
        const snap = await getDocs(q);
        snap.forEach(d => events.push(d.data() as BusinessValueEvent));
      }
    } catch (err) {
      console.warn("[ROIEngine] Ledger query warning:", err);
    }

    let totalAiCost = 0;
    let totalComputeCost = 0;
    let totalHumanOpsCost = 0;
    let totalCandidatesProcessed = 0;
    let totalQualified = 0;
    let totalSubmissions = 0;
    let totalInterviews = 0;
    let totalOffers = 0;
    let totalPlacements = 0;

    // Strictly NON-ADDITIVE Staged Values
    let potentialValue = 0;
    let pipelineValue = 0;
    let bookedRevenue = 0;
    let realizedRevenue = 0;

    let manualEvents = 0;
    let aiAssistedEvents = 0;
    let agentExecutedEvents = 0;

    const attributionDimensions: ROISummary["attributionDimensions"] = {
      candidateSource: {},
      matchContribution: {},
      submissionContribution: {},
      interviewContribution: {},
      placementContribution: {},
      realizedRevenueAttribution: {}
    };

    const vendorAttribution: ROISummary["vendorAttribution"] = {};
    const recruiterAttribution: ROISummary["recruiterAttribution"] = {};

    for (const evt of events) {
      totalAiCost += evt.cost?.aiCost || 0;
      totalComputeCost += evt.cost?.infrastructureCost || 0;
      totalHumanOpsCost += evt.cost?.humanReviewCost || 0;

      // Staged values strictly kept separate (non-additive)
      if (evt.stage === "POTENTIAL") potentialValue += evt.estimatedValue || 0;
      if (evt.stage === "PIPELINE") pipelineValue += evt.estimatedValue || 0;
      if (evt.stage === "BOOKED") bookedRevenue += evt.estimatedValue || 0;
      if (evt.stage === "REALIZED") realizedRevenue += evt.realizedValue || 0;

      switch (evt.attributionType) {
        case "MANUAL": manualEvents++; break;
        case "AI_ASSISTED": aiAssistedEvents++; break;
        case "AGENT_EXECUTED": agentExecutedEvents++; break;
      }

      switch (evt.eventType) {
        case BusinessEventType.CANDIDATE_MATCHED:
          totalCandidatesProcessed++;
          if (evt.vendorId) {
            attributionDimensions.candidateSource[evt.vendorId] = (attributionDimensions.candidateSource[evt.vendorId] || 0) + 1;
          }
          attributionDimensions.matchContribution[evt.actorId] = (attributionDimensions.matchContribution[evt.actorId] || 0) + 1;
          break;
        case BusinessEventType.CANDIDATE_SHORTLISTED:
          totalQualified++;
          attributionDimensions.matchContribution[evt.actorId] = (attributionDimensions.matchContribution[evt.actorId] || 0) + 1;
          break;
        case BusinessEventType.SUBMISSION_SENT:
        case BusinessEventType.SUBMISSION_PREPARED:
          totalSubmissions++;
          attributionDimensions.submissionContribution[evt.actorId] = (attributionDimensions.submissionContribution[evt.actorId] || 0) + 1;
          break;
        case BusinessEventType.INTERVIEW_SCHEDULED:
        case BusinessEventType.INTERVIEW_COMPLETED:
          totalInterviews++;
          attributionDimensions.interviewContribution[evt.actorId] = (attributionDimensions.interviewContribution[evt.actorId] || 0) + 1;
          break;
        case BusinessEventType.OFFER_RECEIVED:
          totalOffers++;
          break;
        case BusinessEventType.PLACEMENT_MADE:
        case BusinessEventType.PLACEMENT_BILLED:
        case BusinessEventType.PAYMENT_RECEIVED:
          if (evt.eventType !== BusinessEventType.PAYMENT_RECEIVED) {
            totalPlacements++;
            attributionDimensions.placementContribution[evt.actorId] = (attributionDimensions.placementContribution[evt.actorId] || 0) + 1;
          }
          if (evt.stage === "REALIZED" && evt.realizedValue > 0) {
            attributionDimensions.realizedRevenueAttribution[evt.actorId] = (attributionDimensions.realizedRevenueAttribution[evt.actorId] || 0) + evt.realizedValue;
          }
          break;
      }

      // Vendor Attribution (Direct supply)
      if (evt.vendorId) {
        if (!vendorAttribution[evt.vendorId]) {
          vendorAttribution[evt.vendorId] = {
            candidatesSupplied: 0,
            submissions: 0,
            interviews: 0,
            placements: 0
          };
        }
        if (evt.eventType === BusinessEventType.CANDIDATE_MATCHED) vendorAttribution[evt.vendorId].candidatesSupplied++;
        if (evt.eventType === BusinessEventType.SUBMISSION_SENT) vendorAttribution[evt.vendorId].submissions++;
        if (evt.eventType === BusinessEventType.INTERVIEW_SCHEDULED) vendorAttribution[evt.vendorId].interviews++;
        if (evt.eventType === BusinessEventType.PLACEMENT_MADE) vendorAttribution[evt.vendorId].placements++;
      }

      // Recruiter Attribution (Only attributed if explicitly present and not null)
      if (evt.recruiterId) {
        if (!recruiterAttribution[evt.recruiterId]) {
          recruiterAttribution[evt.recruiterId] = {
            recruiterId: evt.recruiterId,
            submissionsHandled: 0,
            interviewsScheduled: 0,
            placementsCredited: 0
          };
        }
        if (evt.eventType === BusinessEventType.SUBMISSION_SENT) recruiterAttribution[evt.recruiterId].submissionsHandled++;
        if (evt.eventType === BusinessEventType.INTERVIEW_SCHEDULED) recruiterAttribution[evt.recruiterId].interviewsScheduled++;
        if (evt.eventType === BusinessEventType.PLACEMENT_MADE) recruiterAttribution[evt.recruiterId].placementsCredited++;
      }
    }

    const totalOperatingCost = totalAiCost + totalComputeCost + totalHumanOpsCost;
    const attributedGrossMargin = realizedRevenue * 0.25; // Standard 25% placement margin baseline from realized revenue
    const aeeResult = this.calculateAEE(attributedGrossMargin, totalOperatingCost);

    return {
      tenantId: tenantId || "all",
      totalOperatingCost,
      aiCost: totalAiCost,
      computeCost: totalComputeCost,
      humanOpsCost: totalHumanOpsCost,
      totalCandidatesProcessed,
      totalQualified,
      totalSubmissions,
      totalInterviews,
      totalOffers,
      totalPlacements,
      bookedRevenue,
      realizedRevenue,
      attributedGrossMargin,
      agentEconomicEfficiency: aeeResult.aee,
      aeeStatus: aeeResult.status,
      aeeReason: aeeResult.reason,
      costPerSubmission: totalSubmissions > 0 ? Number((totalOperatingCost / totalSubmissions).toFixed(2)) : 0,
      costPerInterview: totalInterviews > 0 ? Number((totalOperatingCost / totalInterviews).toFixed(2)) : 0,
      costPerPlacement: totalPlacements > 0 ? Number((totalOperatingCost / totalPlacements).toFixed(2)) : 0,
      stagedValues: {
        potentialValue,
        pipelineValue,
        bookedRevenue,
        realizedRevenue
      },
      attributionBreakdown: {
        manualEvents,
        aiAssistedEvents,
        agentExecutedEvents
      },
      attributionDimensions,
      vendorAttribution,
      recruiterAttribution
    };
  }
}

export const roiEngine = ROIEngine.getInstance();
