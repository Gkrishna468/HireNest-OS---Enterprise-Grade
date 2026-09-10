import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AccessControlService, HireNestAccessContext } from "./accessControlService";
import { RequirementDistributionService } from "./requirementDistributionService";
import { emitEvent } from "./eventBus";

export type RequirementStatus = 'ACTIVE' | 'HOLD' | 'SOURCING_PAUSED' | 'CLOSED' | 'EXPIRED';

export type DistributionStatus = 'PUBLISHED' | 'UNPUBLISHED';

export type CanonicalWorkMode = 'REMOTE' | 'REMOTE_C2C' | 'ONSITE_FTE' | 'ONSITE_CONTRACT' | 'C2H' | 'HYBRID';

export interface TransitionRequest {
  requirementId: string;
  targetStatus: RequirementStatus;
  context: HireNestAccessContext;
  reason?: string;
}

export interface TransitionResult {
  success: boolean;
  requirementId: string;
  oldStatus: string;
  newStatus: RequirementStatus;
  message?: string;
}

export class RequirementLifecycleService {
  /**
   * Normalizes raw status strings into canonical lifecycle states
   */
  static normalizeStatus(rawStatus?: string): RequirementStatus {
    if (!rawStatus) return 'ACTIVE';
    const s = rawStatus.trim().toUpperCase();
    if (s === 'ACTIVE' || s === 'OPEN' || s === 'PUBLISHED') return 'ACTIVE';
    if (s === 'HOLD' || s === 'ON HOLD' || s === 'PAUSED') return 'HOLD';
    if (s === 'SOURCING_PAUSED' || s === 'SOURCING PAUSED' || s === 'PAUSED SOURCING') return 'SOURCING_PAUSED';
    if (s === 'CLOSED' || s === 'FILLED') return 'CLOSED';
    if (s === 'EXPIRED') return 'EXPIRED';
    return 'ACTIVE';
  }

  /**
   * Normalizes raw work mode strings into canonical categories
   */
  static normalizeWorkMode(rawMode?: string): CanonicalWorkMode {
    if (!rawMode) return 'REMOTE';
    const mode = rawMode.trim().toUpperCase();
    if (mode.includes('C2C') || mode.includes('CORP TO CORP')) return 'REMOTE_C2C';
    if (mode.includes('C2H') || mode.includes('CORP TO HIRE') || mode.includes('CONTRACT TO HIRE')) return 'C2H';
    if (mode.includes('ONSITE') && (mode.includes('CONTRACT') || mode.includes('C2C'))) return 'ONSITE_CONTRACT';
    if (mode.includes('ONSITE') || mode.includes('FTE') || mode.includes('PERMANENT') || mode.includes('FULL TIME')) return 'ONSITE_FTE';
    if (mode.includes('HYBRID')) return 'HYBRID';
    return 'REMOTE';
  }

  /**
   * Authoritative server-side lifecycle transition for requirements
   */
  static async transition(params: TransitionRequest): Promise<TransitionResult> {
    const { requirementId, targetStatus, context, reason } = params;

    // 1. Authoritative security boundary check
    const canEdit = await AccessControlService.canEditRequirement(context, requirementId);
    if (!canEdit) {
      throw new Error(`[RequirementLifecycleService] Access Denied: User role ${context.role} is not authorized to modify requirement ${requirementId}`);
    }

    // 2. Fetch canonical requirement
    const reqRef = doc(db, 'requirements_public', requirementId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) {
      return {
        success: false,
        requirementId,
        oldStatus: 'UNKNOWN',
        newStatus: targetStatus,
        message: 'Requirement document not found.'
      };
    }

    const reqData = reqSnap.data();
    const oldStatus: string = reqData.status || 'ACTIVE';

    if (oldStatus === targetStatus) {
      return {
        success: true,
        requirementId,
        oldStatus,
        newStatus: targetStatus,
        message: `Requirement is already in status ${targetStatus}`
      };
    }

    // 3. Update status in canonical Firestore record
    const timestamp = new Date().toISOString();
    const isTargetActive = targetStatus === 'ACTIVE';
    const targetDistStatus = isTargetActive
      ? (reqData.distributionStatus === 'PUBLISHED' ? 'PUBLISHED' : 'UNPUBLISHED')
      : 'UNPUBLISHED';
    const isPublished = targetDistStatus === 'PUBLISHED';

    const updatedPayload = {
      status: targetStatus,
      distributionStatus: targetDistStatus,
      published: isPublished,
      vendorVisibility: isPublished ? 'ENABLED' : 'DISABLED',
      updatedAt: timestamp,
      lastStatusChangedAt: timestamp,
      lastStatusChangedBy: context.userId,
      lastStatusReason: reason || `Status changed from ${oldStatus} to ${targetStatus}`
    };

    await updateDoc(reqRef, updatedPayload);

    // 4. Update distribution & syndication based on canonical state
    if (isPublished) {
      await RequirementDistributionService.publishRequirement(requirementId, { ...reqData, ...updatedPayload });
    } else {
      await RequirementDistributionService.unpublishRequirement(requirementId);
    }

    // 5. Write structured audit event to requirement_audit_events
    try {
      await addDoc(collection(db, 'requirement_audit_events'), {
        requirementId,
        oldStatus,
        newStatus: targetStatus,
        action: targetStatus === 'HOLD' ? 'REQUIREMENT_HOLD' : targetStatus === 'ACTIVE' ? 'REQUIREMENT_ACTIVATED' : `REQUIREMENT_${targetStatus}`,
        changedByUserId: context.userId,
        changedByRole: context.role,
        organizationId: context.organizationId,
        timestamp,
        reason: reason || `Status transitioned from ${oldStatus} to ${targetStatus}`
      });

      await emitEvent(
        'REQUIREMENT_STATUS_CHANGED',
        'JOB',
        requirementId,
        context.userId,
        context.role,
        { oldStatus, newStatus: targetStatus, reason }
      );
    } catch (auditErr) {
      console.warn('[RequirementLifecycleService] Non-blocking audit write warning:', auditErr);
    }

    return {
      success: true,
      requirementId,
      oldStatus,
      newStatus: targetStatus,
      message: `Successfully transitioned requirement ${requirementId} from ${oldStatus} to ${targetStatus}`
    };
  }
}

export const requirementLifecycleService = RequirementLifecycleService;
