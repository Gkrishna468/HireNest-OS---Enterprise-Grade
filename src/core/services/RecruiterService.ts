import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError, CoreAuthorizationError } from "../types.js";
import { VendorService } from "./VendorService.js";

export interface RecruiterEntity {
  id: string;
  uid: string;
  name: string;
  email: string;
  vendorId: string;
  vendorName?: string;
  status: "ACTIVE" | "INACTIVE";
  activeSubmissionsCount: number;
  totalPlacementsCount: number;
  createdAt: string;
  updatedAt: string;
}

export class RecruiterService {
  static async getRecruiter(ctx: HireNestAccessContext, recruiterId: string): Promise<RecruiterEntity> {
    enforceCoreAccess(ctx, "recruiters.read");

    const snap = await getDoc(doc(db, "recruiters", recruiterId));
    if (!snap.exists()) {
      throw new CoreResourceNotFoundError("Recruiter", recruiterId);
    }
    const data = snap.data() as RecruiterEntity;

    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const callerVendor = ctx.vendorId || ctx.organizationId;
      enforceCoreAccess(ctx, "recruiters.read", { vendorId: data.vendorId || callerVendor });
    }

    return { ...data, id: snap.id };
  }

  static async listRecruitersByVendor(ctx: HireNestAccessContext, vendorId: string): Promise<RecruiterEntity[]> {
    enforceCoreAccess(ctx, "recruiters.read");

    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const callerVendor = ctx.vendorId || ctx.organizationId;
      if (callerVendor !== vendorId) {
        throw new CoreAuthorizationError(`Vendor cannot view recruiters of another vendor: ${vendorId}`);
      }
    }

    const q = query(collection(db, "recruiters"), where("vendorId", "==", vendorId), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as RecruiterEntity), id: d.id }));
  }

  static async registerRecruiter(
    ctx: HireNestAccessContext,
    payload: { uid: string; name: string; email: string; vendorId: string; vendorName?: string }
  ): Promise<RecruiterEntity> {
    await VendorService.assertCanManageRecruiter(ctx, payload.vendorId);

    const id = payload.uid;
    const now = new Date().toISOString();

    const entity: RecruiterEntity = {
      id,
      uid: payload.uid,
      name: payload.name,
      email: payload.email,
      vendorId: payload.vendorId,
      vendorName: payload.vendorName,
      status: "ACTIVE",
      activeSubmissionsCount: 0,
      totalPlacementsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, "recruiters", id), entity, { merge: true });
    return entity;
  }
}
