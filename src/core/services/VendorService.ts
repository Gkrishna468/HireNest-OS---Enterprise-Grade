import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError, CoreAuthorizationError } from "../types.js";

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

    const snap = await getDoc(doc(db, "organizations", vendorId));
    if (!snap.exists() || snap.data()?.orgType !== "VENDOR") {
      throw new CoreResourceNotFoundError("Vendor", vendorId);
    }
    const data = snap.data();
    return {
      id: snap.id,
      name: data.companyName || data.name || "HireNest Vendor",
      tier: data.tier || "TIER_1",
      trustScore: data.trustScore !== undefined ? data.trustScore : 100,
      status: data.status || "ACTIVE",
      recruiterSeatLimit: data.recruiterSeatLimit || 5,
      activeRecruitersCount: data.activeRecruitersCount || 1,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  static async listVendors(ctx: HireNestAccessContext): Promise<VendorEntity[]> {
    enforceCoreAccess(ctx, "vendors.read");

    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const userVendor = ctx.vendorId || ctx.organizationId;
      const snap = await getDoc(doc(db, "organizations", userVendor));
      if (snap.exists() && snap.data()?.orgType === "VENDOR") {
        const data = snap.data();
        return [{
          id: snap.id,
          name: data.companyName || data.name || "HireNest Vendor",
          tier: data.tier || "TIER_1",
          trustScore: data.trustScore !== undefined ? data.trustScore : 100,
          status: data.status || "ACTIVE",
          recruiterSeatLimit: data.recruiterSeatLimit || 5,
          activeRecruitersCount: data.activeRecruitersCount || 1,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        }];
      }
      return [];
    }

    const q = query(collection(db, "organizations"), where("orgType", "==", "VENDOR"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.companyName || data.name || "HireNest Vendor",
        tier: data.tier || "TIER_1",
        trustScore: data.trustScore !== undefined ? data.trustScore : 100,
        status: data.status || "ACTIVE",
        recruiterSeatLimit: data.recruiterSeatLimit || 5,
        activeRecruitersCount: data.activeRecruitersCount || 1,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    });
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
