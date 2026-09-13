import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError, CoreAuthorizationError } from "../types";

export interface VendorEntity {
  id: string;
  name: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  trustScore: number;
  status: "ACTIVE" | "PROBATION" | "SUSPENDED";
  recruiterSeatLimit: number;
  activeRecruitersCount: number;
  createdAt: string;
  updatedAt: string;
}

export class VendorService {
  static async getVendor(ctx: HireNestAccessContext, vendorId: string): Promise<VendorEntity> {
    enforceCoreAccess(ctx, "vendors.read");

    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const userVendor = ctx.vendorId || ctx.organizationId;
      enforceCoreAccess(ctx, "vendors.read", { vendorId: userVendor });
    }

    const snap = await getDoc(doc(db, "vendors", vendorId));
    if (!snap.exists()) {
      throw new CoreResourceNotFoundError("Vendor", vendorId);
    }
    return { ...(snap.data() as VendorEntity), id: snap.id };
  }

  static async listVendors(ctx: HireNestAccessContext): Promise<VendorEntity[]> {
    enforceCoreAccess(ctx, "vendors.read");

    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const userVendor = ctx.vendorId || ctx.organizationId;
      const snap = await getDoc(doc(db, "vendors", userVendor));
      return snap.exists() ? [{ ...(snap.data() as VendorEntity), id: snap.id }] : [];
    }

    const snap = await getDocs(query(collection(db, "vendors"), limit(100)));
    return snap.docs.map((d) => ({ ...(d.data() as VendorEntity), id: d.id }));
  }

  /**
   * Authorizes Vendor Recruiter creation under parent Vendor Organization
   */
  static async assertCanManageRecruiter(ctx: HireNestAccessContext, targetVendorId: string): Promise<void> {
    enforceCoreAccess(ctx, "vendors.manage_recruiters");
    if (!ctx.isAdminEquivalent) {
      const callerVendor = ctx.vendorId || ctx.organizationId;
      if (callerVendor !== targetVendorId) {
        throw new CoreAuthorizationError(
          `Vendor Admin can only manage recruiters for own agency (${callerVendor}). Attempted: ${targetVendorId}`
        );
      }
    }
  }
}
