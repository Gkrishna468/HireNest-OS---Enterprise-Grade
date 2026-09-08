import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { recruiterVendorMappingService } from "./recruiterVendorMappingService";

export interface RequirementVendorMapping {
  id: string; // `reqven-${requirementId}-${vendorId}`
  requirementId: string;
  vendorId: string;
  vendorName?: string;
  recruiterId: string;
  recruiterName?: string;
  assignedBy?: string;
  assignedAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  visibility: 'ENABLED' | 'DISABLED';
  submissionAllowed: boolean;
  candidateLimit?: number;
  expiresAt?: string;
  lastViewedAt?: string;
}

export type DistributionMode = 'ALL_MAPPED_VENDORS' | 'SELECTED_VENDORS' | 'RECRUITER_ONLY' | 'MANUAL';

export interface VendorDiagnosticStatus {
  vendorId: string;
  vendorName: string;
  status: 'VISIBLE' | 'NOT_ASSIGNED' | 'RECRUITER_NOT_MAPPED' | 'VENDOR_INACTIVE';
  badgeColor: string;
  statusText: string;
  reason: string;
  actionableMessage?: string;
  actionType?: 'ASSIGN_VENDOR' | 'MANAGE_RECRUITER' | 'ACTIVATE_VENDOR' | 'NONE';
}

class RequirementVendorService {

  /**
   * Get all vendor distribution mappings for a specific requirement
   */
  async getRequirementVendorMappings(requirementId: string): Promise<RequirementVendorMapping[]> {
    try {
      const q = query(
        collection(db, "requirement_vendors"),
        where("requirementId", "==", requirementId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as RequirementVendorMapping));
    } catch (err: any) {
      console.warn("[RequirementVendorService] Error fetching mappings:", err?.message);
      return [];
    }
  }

  /**
   * Set or update requirement distribution across vendors
   */
  async setRequirementDistribution(params: {
    requirementId: string;
    recruiterId: string;
    recruiterName: string;
    distributionMode: DistributionMode;
    selectedVendorIds: string[];
    assignedBy?: string;
  }): Promise<{ success: boolean; count: number; vendorIds: string[] }> {
    const {
      requirementId,
      recruiterId,
      recruiterName,
      distributionMode,
      selectedVendorIds,
      assignedBy = "HQ Admin"
    } = params;

    try {
      // 1. Resolve effective target vendors based on mode
      let targetVendorIds: string[] = [];
      const allMappedVendors = await recruiterVendorMappingService.getVendorsForRecruiter(recruiterId);
      const activeMappedVendorIds = allMappedVendors
        .filter(m => m.status === 'ACTIVE')
        .map(m => m.vendorId);

      if (distributionMode === 'ALL_MAPPED_VENDORS') {
        targetVendorIds = activeMappedVendorIds;
      } else if (distributionMode === 'SELECTED_VENDORS' || distributionMode === 'MANUAL') {
        targetVendorIds = selectedVendorIds;
      } else if (distributionMode === 'RECRUITER_ONLY') {
        targetVendorIds = [];
      }

      // 2. Fetch existing requirement_vendors for this requirement
      const existingMappings = await this.getRequirementVendorMappings(requirementId);
      const existingMap = new Map(existingMappings.map(m => [m.vendorId, m]));

      // 3. Update requirement document in requirements_public
      const reqRef = doc(db, "requirements_public", requirementId);
      await setDoc(reqRef, {
        assignedRecruiterId: recruiterId,
        assignedRecruiterName: recruiterName,
        recruiterId: recruiterId,
        recruiterName: recruiterName,
        distributionMode: distributionMode,
        vendorVisibility: distributionMode === 'RECRUITER_ONLY' ? 'DISABLED' : 'ENABLED',
        vendor_visibility: distributionMode === 'RECRUITER_ONLY' ? 'DISABLED' : 'ENABLED',
        vendor_visible: distributionMode !== 'RECRUITER_ONLY',
        distributedVendorIds: targetVendorIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 4. Batch sync requirement_vendors collection
      for (const vId of targetVendorIds) {
        const docId = `reqven-${requirementId}-${vId}`;
        const mappingRef = doc(db, "requirement_vendors", docId);
        
        // Find vendor name
        const mappedObj = allMappedVendors.find(v => v.vendorId === vId);
        const vName = mappedObj?.vendorName || (vId === 'vendor-abc' ? 'ABC Technologies' : vId === 'vendor-xyz' ? 'XYZ Solutions' : vId === 'vendor-techsource' ? 'TechSource India' : 'CloudStaff Solutions');

        await setDoc(mappingRef, {
          id: docId,
          requirementId,
          vendorId: vId,
          vendorName: vName,
          recruiterId,
          recruiterName,
          assignedBy,
          assignedAt: new Date().toISOString(),
          status: 'ACTIVE',
          visibility: 'ENABLED',
          submissionAllowed: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // 5. Deactivate vendors that were un-selected
      for (const existing of existingMappings) {
        if (!targetVendorIds.includes(existing.vendorId)) {
          const mappingRef = doc(db, "requirement_vendors", existing.id);
          await updateDoc(mappingRef, {
            status: 'INACTIVE',
            visibility: 'DISABLED',
            updatedAt: new Date().toISOString()
          });
        }
      }

      return { success: true, count: targetVendorIds.length, vendorIds: targetVendorIds };
    } catch (err: any) {
      console.error("[RequirementVendorService] Distribution error:", err?.message);
      return { success: false, count: 0, vendorIds: [] };
    }
  }

  /**
   * Diagnostic helper to determine why a vendor can or cannot see a requirement
   */
  async getVendorDiagnosticsForRequirement(
    requirementId: string,
    allSystemVendors: { id: string; name: string; status?: string }[]
  ): Promise<VendorDiagnosticStatus[]> {
    try {
      const reqDocRef = doc(db, "requirements_public", requirementId);
      const reqSnap = await getDoc(reqDocRef);
      const reqData = reqSnap.exists() ? reqSnap.data() : null;

      const recruiterId = reqData?.assignedRecruiterId || reqData?.recruiterId || 'recruiter-rahul';
      const recruiterName = reqData?.assignedRecruiterName || reqData?.recruiterName || 'Rahul Sharma';
      const distributionMode: DistributionMode = reqData?.distributionMode || 'ALL_MAPPED_VENDORS';

      // Get recruiter-vendor mappings
      const recruiterVendorMaps = await recruiterVendorMappingService.getVendorsForRecruiter(recruiterId);
      const mappedVendorIds = new Set(recruiterVendorMaps.filter(m => m.status === 'ACTIVE').map(m => m.vendorId));

      // Get requirement_vendors mappings
      const reqVendorMappings = await this.getRequirementVendorMappings(requirementId);
      const activeReqVendorIds = new Set(
        reqVendorMappings.filter(m => m.status === 'ACTIVE' && m.visibility === 'ENABLED').map(m => m.vendorId)
      );

      const diagnostics: VendorDiagnosticStatus[] = [];

      for (const vendor of allSystemVendors) {
        const isVendorActive = (vendor.status || 'ACTIVE') === 'ACTIVE';
        const isMappedToRecruiter = mappedVendorIds.has(vendor.id);
        const isDistributedToVendor = activeReqVendorIds.has(vendor.id) || (
          distributionMode === 'ALL_MAPPED_VENDORS' && isMappedToRecruiter
        );

        if (!isVendorActive) {
          diagnostics.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            status: 'VENDOR_INACTIVE',
            badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
            statusText: 'Vendor Inactive',
            reason: `Vendor account '${vendor.name}' is currently paused or inactive in HQ registry.`,
            actionableMessage: 'Activate vendor in HQ Vendor Management.',
            actionType: 'ACTIVATE_VENDOR'
          });
        } else if (!isMappedToRecruiter) {
          diagnostics.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            status: 'RECRUITER_NOT_MAPPED',
            badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            statusText: 'Recruiter Not Mapped',
            reason: `'${vendor.name}' is not currently mapped to Recruiter ${recruiterName}.`,
            actionableMessage: `Map ${vendor.name} to ${recruiterName} in Network Matrix.`,
            actionType: 'MANAGE_RECRUITER'
          });
        } else if (!isDistributedToVendor) {
          diagnostics.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            status: 'NOT_ASSIGNED',
            badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            statusText: 'Not Distributed',
            reason: `Requirement has not been explicitly distributed to ${vendor.name}.`,
            actionableMessage: 'Include vendor in selected distribution list.',
            actionType: 'ASSIGN_VENDOR'
          });
        } else {
          diagnostics.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            status: 'VISIBLE',
            badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            statusText: 'Visible to Vendor',
            reason: `Requirement is live and accessible in ${vendor.name}'s workspace.`,
            actionType: 'NONE'
          });
        }
      }

      return diagnostics;
    } catch (err: any) {
      console.warn("[RequirementVendorService] Diagnostic error:", err?.message);
      return [];
    }
  }

  /**
   * Automatically synchronize vendor authorizations when a requirement's status or assignment changes.
   * Called on requirement activation, editing, or status toggle.
   */
  async syncRequirementVendorAuthorization(
    requirementId: string,
    reqData?: any
  ): Promise<{ success: boolean; authorizedVendorIds: string[] }> {
    try {
      let requirement = reqData;
      if (!requirement) {
        const reqSnap = await getDoc(doc(db, "requirements_public", requirementId));
        if (!reqSnap.exists()) {
          console.warn(`[RequirementVendorService] Requirement ${requirementId} not found.`);
          return { success: false, authorizedVendorIds: [] };
        }
        requirement = { id: reqSnap.id, ...reqSnap.data() };
      }

      const status = (requirement.status || "ACTIVE").toUpperCase();
      const isActive = status === "ACTIVE" || status === "PUBLISHED";
      const recruiterId = requirement.assignedRecruiterId || requirement.recruiterId || "recruiter-rahul";
      const recruiterName = requirement.assignedRecruiterName || requirement.recruiterName || "Rahul Sharma";
      const distributionMode: DistributionMode = requirement.distributionMode || "ALL_MAPPED_VENDORS";

      if (isActive) {
        // Resolve active vendors mapped to the assigned recruiter
        const recruiterVendors = await recruiterVendorMappingService.getVendorsForRecruiter(recruiterId);
        const activeMappedVendorIds = recruiterVendors
          .filter(m => m.status === 'ACTIVE')
          .map(m => m.vendorId);

        let targetVendorIds: string[] = [];
        if (distributionMode === 'ALL_MAPPED_VENDORS') {
          targetVendorIds = activeMappedVendorIds.length > 0 
            ? activeMappedVendorIds 
            : ['vendor-abc', 'vendor-xyz', 'vendor-techsource', 'vendor-cloudstaff'];
        } else if (distributionMode === 'SELECTED_VENDORS' || distributionMode === 'MANUAL') {
          targetVendorIds = Array.isArray(requirement.distributedVendorIds) && requirement.distributedVendorIds.length > 0
            ? requirement.distributedVendorIds
            : activeMappedVendorIds;
        } else if (distributionMode === 'RECRUITER_ONLY') {
          targetVendorIds = [];
        }

        // Upsert requirement_vendors collection for authorized vendors
        for (const vId of targetVendorIds) {
          const docId = `reqven-${requirementId}-${vId}`;
          const mappingRef = doc(db, "requirement_vendors", docId);
          const mappedObj = recruiterVendors.find(v => v.vendorId === vId);
          const vName = mappedObj?.vendorName || (
            vId === 'vendor-abc' ? 'ABC Technologies' :
            vId === 'vendor-xyz' ? 'XYZ Solutions' :
            vId === 'vendor-techsource' ? 'TechSource India' : 'CloudStaff Solutions'
          );

          await setDoc(mappingRef, {
            id: docId,
            requirementId,
            vendorId: vId,
            vendorName: vName,
            recruiterId,
            recruiterName,
            assignedBy: "HQ System Sync",
            assignedAt: new Date().toISOString(),
            status: 'ACTIVE',
            visibility: 'ENABLED',
            submissionAllowed: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Deactivate vendor mappings not in target set
        const existingMappings = await this.getRequirementVendorMappings(requirementId);
        for (const existing of existingMappings) {
          if (!targetVendorIds.includes(existing.vendorId)) {
            await updateDoc(doc(db, "requirement_vendors", existing.id), {
              status: 'INACTIVE',
              visibility: 'DISABLED',
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Update requirement public metadata
        await setDoc(doc(db, "requirements_public", requirementId), {
          distributedVendorIds: targetVendorIds,
          vendorVisibility: targetVendorIds.length > 0 ? 'ENABLED' : 'DISABLED',
          assignedRecruiterId: recruiterId,
          assignedRecruiterName: recruiterName,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true, authorizedVendorIds: targetVendorIds };
      } else {
        // Requirement is CLOSED / INACTIVE / ON_HOLD -> Revoke vendor access
        const existingMappings = await this.getRequirementVendorMappings(requirementId);
        for (const existing of existingMappings) {
          await updateDoc(doc(db, "requirement_vendors", existing.id), {
            status: 'INACTIVE',
            visibility: 'DISABLED',
            updatedAt: new Date().toISOString()
          });
        }

        await setDoc(doc(db, "requirements_public", requirementId), {
          vendorVisibility: 'DISABLED',
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true, authorizedVendorIds: [] };
      }
    } catch (err: any) {
      console.error("[RequirementVendorService] Error syncing vendor authorization:", err?.message);
      return { success: false, authorizedVendorIds: [] };
    }
  }

  /**
   * One-time or background sweep to synchronize all active requirements with mapped vendors
   */
  async syncAllActiveRequirementsToMappedVendors(): Promise<number> {
    try {
      const q = query(
        collection(db, "requirements_public"),
        where("status", "in", ["ACTIVE", "Active", "PUBLISHED", "Published"])
      );
      const snap = await getDocs(q);
      let count = 0;
      for (const reqDoc of snap.docs) {
        await this.syncRequirementVendorAuthorization(reqDoc.id, { id: reqDoc.id, ...reqDoc.data() });
        count++;
      }
      return count;
    } catch (err: any) {
      console.warn("[RequirementVendorService] Bulk active req sync error:", err?.message);
      return 0;
    }
  }

  /**
   * Security Boundary Check: Authoritatively verifies whether a vendor can view a requirement
   */
  async canVendorViewRequirement(vendorId: string, requirementId: string): Promise<boolean> {
    try {
      const reqSnap = await getDoc(doc(db, "requirements_public", requirementId));
      if (!reqSnap.exists()) return false;
      const req = reqSnap.data();

      const status = (req.status || "ACTIVE").toUpperCase();
      if (status === "CLOSED" || status === "INACTIVE" || status === "DELETED" || status === "ARCHIVED") {
        return false;
      }

      if (req.vendorVisibility === "DISABLED" || req.vendor_visibility === "DISABLED") {
        return false;
      }

      // Check explicit requirement_vendors record
      const docId = `reqven-${requirementId}-${vendorId}`;
      const mappingSnap = await getDoc(doc(db, "requirement_vendors", docId));
      if (mappingSnap.exists() && mappingSnap.data().status === 'ACTIVE' && mappingSnap.data().visibility === 'ENABLED') {
        return true;
      }

      // Check distributedVendorIds array
      if (Array.isArray(req.distributedVendorIds) && req.distributedVendorIds.includes(vendorId)) {
        return true;
      }

      // Check recruiter mapping under ALL_MAPPED_VENDORS mode
      const mode: DistributionMode = req.distributionMode || 'ALL_MAPPED_VENDORS';
      const recruiterId = req.assignedRecruiterId || req.recruiterId || 'recruiter-rahul';
      if (mode === 'ALL_MAPPED_VENDORS') {
        const recruiterVendors = await recruiterVendorMappingService.getVendorsForRecruiter(recruiterId);
        const isMapped = recruiterVendors.some(m => m.vendorId === vendorId && m.status === 'ACTIVE');
        if (isMapped || recruiterVendors.length === 0) return true;
      }

      return false;
    } catch (err: any) {
      console.warn("[RequirementVendorService] Authorization check error:", err?.message);
      return false;
    }
  }

  /**
   * Security Boundary: Returns sanitized View 360 data for a vendor
   */
  async getRequirement360ForVendor(
    vendorId: string,
    requirementId: string
  ): Promise<{ authorized: boolean; reason?: string; data?: any }> {
    const isAuthorized = await this.canVendorViewRequirement(vendorId, requirementId);
    if (!isAuthorized) {
      return {
        authorized: false,
        reason: "Vendor does not have active authorization for this requirement."
      };
    }

    try {
      const reqSnap = await getDoc(doc(db, "requirements_public", requirementId));
      if (!reqSnap.exists()) {
        return { authorized: false, reason: "Requirement record not found." };
      }

      const raw = reqSnap.data();
      
      // Sanitize internal fields to prevent data leakage across vendor boundaries
      const sanitizedData = {
        id: reqSnap.id,
        title: raw.title || raw.role || "Requirement",
        clientName: raw.clientName || "Enterprise Partner",
        clientId: raw.clientId || "client-abc",
        location: raw.location || "Multiple Locations",
        workMode: raw.workMode || raw.mode || "Remote",
        skills: raw.skills || [],
        experience: raw.experience || "Not Specified",
        budget: raw.budget || raw.rate || "Competitive",
        openings: raw.openings || 1,
        priority: raw.priority || "NORMAL",
        description: raw.description || raw.jobDescription || "Standard job description.",
        status: raw.status || "ACTIVE",
        assignedRecruiterName: raw.assignedRecruiterName || raw.recruiterName || "Rahul Sharma",
        assignedRecruiterId: raw.assignedRecruiterId || raw.recruiterId || "recruiter-rahul",
        recruiterSlaHours: 4,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        authorizationId: `reqven-${requirementId}-${vendorId}`
      };

      return { authorized: true, data: sanitizedData };
    } catch (err: any) {
      return { authorized: false, reason: err?.message };
    }
  }

  /**
   * Authoritative backend resolution for candidate submissions
   */
  async resolveSubmissionAuthorization(params: {
    requirementId: string;
    vendorId: string;
  }): Promise<{
    authorized: boolean;
    requirementTitle: string;
    recruiterId: string;
    recruiterName: string;
    clientId: string;
    clientName: string;
    authorizationId: string;
  }> {
    const { requirementId, vendorId } = params;
    const isAuthorized = await this.canVendorViewRequirement(vendorId, requirementId);

    try {
      const reqSnap = await getDoc(doc(db, "requirements_public", requirementId));
      const reqData = reqSnap.exists() ? reqSnap.data() : {};

      return {
        authorized: isAuthorized,
        requirementTitle: reqData?.title || reqData?.role || "Requirement",
        recruiterId: reqData?.assignedRecruiterId || reqData?.recruiterId || "recruiter-rahul",
        recruiterName: reqData?.assignedRecruiterName || reqData?.recruiterName || "Rahul Sharma",
        clientId: reqData?.clientId || "client-abc",
        clientName: reqData?.clientName || "Enterprise Partner",
        authorizationId: `reqven-${requirementId}-${vendorId}`
      };
    } catch (err: any) {
      console.warn("[RequirementVendorService] Submission authorization resolution error:", err?.message);
      return {
        authorized: false,
        requirementTitle: "Requirement",
        recruiterId: "recruiter-rahul",
        recruiterName: "Rahul Sharma",
        clientId: "client-abc",
        clientName: "Enterprise Partner",
        authorizationId: `reqven-${requirementId}-${vendorId}`
      };
    }
  }
  subscribeToVendorAuthorizedRequirements(
    vendorId: string,
    callback: (reqs: any[]) => void
  ): () => void {
    let unsubReqVendors: (() => void) | null = null;
    let unsubAllReqs: (() => void) | null = null;

    // First fetch recruiter mappings for this vendor
    recruiterVendorMappingService.getRecruitersForVendor(vendorId).then(recruiterMappings => {
      const activeRecruiterIds = recruiterMappings
        .filter(m => m.status === 'ACTIVE')
        .map(m => m.recruiterId);

      // Listener on requirement_vendors collection for this vendor
      const qReqVen = query(
        collection(db, "requirement_vendors"),
        where("vendorId", "==", vendorId),
        where("status", "==", "ACTIVE")
      );

      unsubReqVendors = onSnapshot(qReqVen, (reqVenSnap) => {
        const explicitReqIds = new Set(reqVenSnap.docs.map(d => d.data().requirementId));

        // Listener on requirements_public
        unsubAllReqs = onSnapshot(collection(db, "requirements_public"), (reqSnap) => {
          const allReqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const authorizedReqs = allReqs.filter((req: any) => {
            const status = (req.status || "ACTIVE").toUpperCase();
            if (status !== "ACTIVE" && status !== "PUBLISHED") {
              return false;
            }

            const isVendorVisible = req.vendor_visibility !== "DISABLED" && req.vendorVisibility !== "DISABLED";
            if (!isVendorVisible) return false;

            const mode: DistributionMode = req.distributionMode || "ALL_MAPPED_VENDORS";
            const reqRecruiterId = req.assignedRecruiterId || req.recruiterId || "recruiter-rahul";

            // Explicit requirement_vendor mapping
            if (explicitReqIds.has(req.id)) {
              return true;
            }

            // Automatic distribution mode: ALL_MAPPED_VENDORS
            if (mode === "ALL_MAPPED_VENDORS" && (activeRecruiterIds.includes(reqRecruiterId) || activeRecruiterIds.length === 0)) {
              return true;
            }

            // Explicit distributedVendorIds array check on requirement doc
            if (Array.isArray(req.distributedVendorIds) && req.distributedVendorIds.includes(vendorId)) {
              return true;
            }

            // Fallback for default seed/legacy requirements without distribution tags
            if (!req.distributionMode && !req.distributedVendorIds && explicitReqIds.size === 0) {
              return true; // Keep baseline requirements accessible in initial seed
            }

            return false;
          });

          callback(authorizedReqs);
        }, (err) => console.warn("[RequirementVendorService] reqs listener note:", err?.message));
      }, (err) => console.warn("[RequirementVendorService] req_vendors listener note:", err?.message));
    }).catch(err => {
      console.warn("[RequirementVendorService] recruiter mapping error:", err?.message);
    });

    return () => {
      if (unsubReqVendors) unsubReqVendors();
      if (unsubAllReqs) unsubAllReqs();
    };
  }
}

export const requirementVendorService = new RequirementVendorService();
