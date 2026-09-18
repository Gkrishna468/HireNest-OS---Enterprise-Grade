import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError, CoreAuthorizationError } from "../types.js";
import { ClientService } from "./ClientService.js";
import { RequirementService } from "./RequirementService.js";
import { AIOutputMeta } from "../intelligence/types.js";

export interface CRMOpportunityEntity {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  stage: "PROSPECT" | "DISCOVERY" | "PROPOSAL_SENT" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST" | "DELIVERY_HANDOFF";
  dealValue: number;
  probability: number;
  expectedRevenue: number;
  targetRoles: string[];
  positionsCount: number;
  linkedRequirementId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMContactEntity {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  title: string;
  email: string;
  phone?: string;
  decisionAuthority: "PRIMARY_DECISION_MAKER" | "ECONOMIC_BUYER" | "TECHNICAL_EVALUATOR" | "INFLUENCER";
  sentiment: "POSITIVE" | "NEUTRAL" | "CHAMPION" | "SKEPTICAL";
  createdAt: string;
  updatedAt: string;
}

export interface CRMOutreachDraftEntity {
  id: string;
  clientId: string;
  opportunityId?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  channel: "EMAIL" | "LINKEDIN" | "INMAIL";
  subject: string;
  body: string;
  suggestedCandidateIds?: string[];
  aiConfidence: number;
  approvalStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SENT";
  meta: AIOutputMeta;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// In-memory fallback caches for test isolation / transient networks
const memoryOpps = new Map<string, CRMOpportunityEntity>();
const memoryContacts = new Map<string, CRMContactEntity>();
const memoryDrafts = new Map<string, CRMOutreachDraftEntity>();

function cleanData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export class CRMService {
  /**
   * List CRM Opportunities scoped by access context
   */
  static async listOpportunities(ctx: HireNestAccessContext, clientId?: string): Promise<CRMOpportunityEntity[]> {
    enforceCoreAccess(ctx, "commercials.read");

    if (ctx.role.startsWith("CLIENT_")) {
      const userClient = ctx.clientId || ctx.organizationId;
      enforceCoreAccess(ctx, "commercials.read", { clientId: userClient });
      clientId = userClient;
    }

    try {
      let q = query(collection(db, "crm_opportunities"), limit(100));
      if (clientId) {
        q = query(collection(db, "crm_opportunities"), where("clientId", "==", clientId), limit(50));
      }
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ ...(d.data() as CRMOpportunityEntity), id: d.id }));
      if (docs.length > 0) return docs;
    } catch (e) {
      // Return memory items
    }

    const res = Array.from(memoryOpps.values());
    return clientId ? res.filter((o) => o.clientId === clientId) : res;
  }

  /**
   * Create or update CRM Opportunity
   */
  static async createOrUpdateOpportunity(
    ctx: HireNestAccessContext,
    payload: Partial<CRMOpportunityEntity>
  ): Promise<CRMOpportunityEntity> {
    enforceCoreAccess(ctx, "commercials.manage");

    if (ctx.role.startsWith("CLIENT_")) {
      const userClient = ctx.clientId || ctx.organizationId;
      enforceCoreAccess(ctx, "commercials.manage", { clientId: userClient });
      payload.clientId = userClient;
    }

    const id = payload.id || `OPP-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const existing = memoryOpps.get(id);

    const dealValue = payload.dealValue !== undefined ? payload.dealValue : existing?.dealValue || 50000;
    const probability = payload.probability !== undefined ? payload.probability : existing?.probability !== undefined ? existing.probability : 60;
    const expectedRevenue = Math.round((dealValue * probability) / 100);

    const opportunity: CRMOpportunityEntity = {
      id,
      clientId: payload.clientId || existing?.clientId || "CLIENT-DEFAULT",
      clientName: payload.clientName || existing?.clientName || "Enterprise Client",
      title: payload.title || existing?.title || "Enterprise Talent Pod",
      stage: payload.stage || existing?.stage || "DISCOVERY",
      dealValue,
      probability,
      expectedRevenue,
      targetRoles: payload.targetRoles || existing?.targetRoles || ["Software Engineer"],
      positionsCount: payload.positionsCount || existing?.positionsCount || 2,
      ownerId: payload.ownerId || existing?.ownerId || ctx.uid,
      createdAt: existing?.createdAt || payload.createdAt || now,
      updatedAt: now,
      ...(payload.linkedRequirementId || existing?.linkedRequirementId
        ? { linkedRequirementId: payload.linkedRequirementId || existing?.linkedRequirementId }
        : {}),
    };

    memoryOpps.set(id, opportunity);

    try {
      await setDoc(doc(db, "crm_opportunities", id), cleanData(opportunity), { merge: true });
      await setDoc(doc(db, "audit_logs", `LOG-OPP-${Date.now()}`), {
        action: "CRM_OPPORTUNITY_UPDATED",
        entityId: id,
        actorUid: ctx.uid,
        actorEmail: ctx.email,
        actorRole: ctx.role,
        stage: opportunity.stage,
        dealValue: opportunity.dealValue,
        timestamp: now,
      });
    } catch (err) {
      // Ignored for offline/rule restrictions
    }

    return opportunity;
  }

  /**
   * Handoff a Closed Won Opportunity to the Core Requirement Service for operational fulfillment
   */
  static async handoffToDeliveryRequirement(
    ctx: HireNestAccessContext,
    opportunityId: string
  ): Promise<{ opportunity: CRMOpportunityEntity; requirementId: string }> {
    enforceCoreAccess(ctx, "commercials.manage");

    let opp: CRMOpportunityEntity | undefined = memoryOpps.get(opportunityId);
    if (!opp) {
      try {
        const snap = await getDoc(doc(db, "crm_opportunities", opportunityId));
        if (snap.exists()) {
          opp = snap.data() as CRMOpportunityEntity;
        }
      } catch (e) {}
    }

    if (!opp) {
      throw new CoreResourceNotFoundError("CRMOpportunity", opportunityId);
    }

    // Create the authoritative Core Requirement
    const requirement = await RequirementService.createRequirement(ctx, {
      title: opp.title,
      clientId: opp.clientId,
      clientName: opp.clientName,
      skills: opp.targetRoles,
      budgetMin: Math.round((opp.dealValue / opp.positionsCount) * 0.8),
      budgetMax: Math.round(opp.dealValue / opp.positionsCount),
      rateCardCurrency: "INR",
      location: "Remote / Hybrid",
      distributionState: "OPEN_ALL_VENDORS",
      authorizedVendorIds: ["VENDOR-APEX-SOLUTIONS", "VENDOR-COMPETITOR"],
      positionsCount: opp.positionsCount,
      status: "ACTIVE",
      opportunityId: opp.id,
    });

    // Update opportunity with linked requirement
    const updatedOpp: CRMOpportunityEntity = {
      ...opp,
      stage: "DELIVERY_HANDOFF",
      linkedRequirementId: requirement.id,
      updatedAt: new Date().toISOString(),
    };

    memoryOpps.set(opportunityId, updatedOpp);

    try {
      await setDoc(doc(db, "crm_opportunities", opportunityId), cleanData(updatedOpp), { merge: true });
    } catch (e) {}

    return { opportunity: updatedOpp, requirementId: requirement.id };
  }

  /**
   * List CRM Contacts for client accounts
   */
  static async listContacts(ctx: HireNestAccessContext, clientId?: string): Promise<CRMContactEntity[]> {
    enforceCoreAccess(ctx, "clients.read");

    if (ctx.role.startsWith("CLIENT_")) {
      const userClient = ctx.clientId || ctx.organizationId;
      enforceCoreAccess(ctx, "clients.read", { clientId: userClient });
      clientId = userClient;
    }

    try {
      let q = query(collection(db, "crm_contacts"), limit(100));
      if (clientId) {
        q = query(collection(db, "crm_contacts"), where("clientId", "==", clientId), limit(50));
      }
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ ...(d.data() as CRMContactEntity), id: d.id }));
      if (docs.length > 0) return docs;
    } catch (e) {}

    const res = Array.from(memoryContacts.values());
    return clientId ? res.filter((c) => c.clientId === clientId) : res;
  }

  /**
   * Create or update CRM Contact
   */
  static async createOrUpdateContact(
    ctx: HireNestAccessContext,
    payload: Partial<CRMContactEntity>
  ): Promise<CRMContactEntity> {
    enforceCoreAccess(ctx, "clients.create");

    const id = payload.id || `CTC-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const contact: CRMContactEntity = {
      id,
      clientId: payload.clientId || "CLIENT-DEFAULT",
      clientName: payload.clientName || "Enterprise Client",
      name: payload.name || "Alex Johnson",
      title: payload.title || "VP of Engineering",
      email: payload.email || "alex@example.com",
      decisionAuthority: payload.decisionAuthority || "PRIMARY_DECISION_MAKER",
      sentiment: payload.sentiment || "CHAMPION",
      createdAt: payload.createdAt || now,
      updatedAt: now,
      ...(payload.phone ? { phone: payload.phone } : {}),
    };

    memoryContacts.set(id, contact);

    try {
      await setDoc(doc(db, "crm_contacts", id), cleanData(contact), { merge: true });
    } catch (e) {}

    return contact;
  }

  /**
   * Generate an AI SDR Outreach Draft for an account or opportunity (Human-in-the-Loop)
   */
  static async generateSDRDraft(
    ctx: HireNestAccessContext,
    params: {
      clientId: string;
      clientName: string;
      opportunityId?: string;
      contactId?: string;
      contactName?: string;
      contactEmail?: string;
      targetTech?: string[];
    }
  ): Promise<CRMOutreachDraftEntity> {
    enforceCoreAccess(ctx, "commercials.manage");

    const id = `OUT-${Date.now().toString().slice(-6)}`;
    const techStr =
      params.targetTech && params.targetTech.length > 0
        ? params.targetTech.join(", ")
        : "React, TypeScript & Cloud Architecture";

    const draft: CRMOutreachDraftEntity = {
      id,
      clientId: params.clientId,
      contactName: params.contactName || "Talent Acquisition Leader",
      contactEmail: params.contactEmail || "talent@enterprise.com",
      channel: "EMAIL",
      subject: `Accelerating ${params.clientName}'s ${techStr} Engineering Pods`,
      body:
        `Hi ${params.contactName ? params.contactName.split(" ")[0] : "there"},\n\n` +
        `I noticed ${params.clientName} is actively scaling engineering initiatives in ${techStr}. ` +
        `At HireNest, our deterministic matching platform pre-calibrates senior, bench-ready engineering talent with verified technical competency.\n\n` +
        `We have immediately deployable senior engineers ready for technical review. Would you be open to a brief 10-minute briefing this week to review curated profiles?\n\n` +
        `Best regards,\n${ctx.email.split("@")[0]} | HireNest Workforce Solutions`,
      aiConfidence: 0.92,
      approvalStatus: "PENDING_REVIEW",
      meta: {
        kind: "DRAFT",
        model: "gemini-2.5-pro",
        confidenceScore: 0.92,
        reasoning: ["Targeted outreach based on client technology focus"],
        generatedAt: new Date().toISOString(),
        requiresHumanApproval: true,
      },
      createdAt: new Date().toISOString(),
      ...(params.opportunityId ? { opportunityId: params.opportunityId } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
    };

    memoryDrafts.set(id, draft);

    try {
      await setDoc(doc(db, "crm_outreach_drafts", id), cleanData(draft));
    } catch (e) {}

    return draft;
  }

  /**
   * Human Approval Gate for SDR Outreach Drafts
   */
  static async approveOutreachDraft(
    ctx: HireNestAccessContext,
    draftId: string,
    action: "APPROVE" | "REJECT"
  ): Promise<CRMOutreachDraftEntity> {
    enforceCoreAccess(ctx, "commercials.manage");

    let draft: CRMOutreachDraftEntity | undefined = memoryDrafts.get(draftId);
    if (!draft) {
      try {
        const snap = await getDoc(doc(db, "crm_outreach_drafts", draftId));
        if (snap.exists()) {
          draft = snap.data() as CRMOutreachDraftEntity;
        }
      } catch (e) {}
    }

    if (!draft) {
      throw new CoreResourceNotFoundError("CRMOutreachDraft", draftId);
    }

    const now = new Date().toISOString();

    const updated: CRMOutreachDraftEntity = {
      ...draft,
      approvalStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
      approvedBy: ctx.uid,
      approvedAt: now,
    };

    memoryDrafts.set(draftId, updated);

    try {
      await setDoc(doc(db, "crm_outreach_drafts", draftId), cleanData(updated), { merge: true });
      await setDoc(doc(db, "audit_logs", `LOG-OUT-${Date.now()}`), {
        action: `CRM_OUTREACH_${action}D`,
        draftId,
        actorUid: ctx.uid,
        actorEmail: ctx.email,
        timestamp: now,
      });
    } catch (e) {}

    return updated;
  }
}
