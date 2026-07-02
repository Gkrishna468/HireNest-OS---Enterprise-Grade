import { adminDb } from "../../lib/firebase-admin.js";
import crypto from "crypto";

export class DuplicateResolver {
  static async isDuplicate(
    content: string,
    type: string,
    tenantId: string,
    extractedEntities?: any
  ): Promise<boolean> {
    if (!adminDb || !content) return false;

    const collName =
      type === "Resume"
        ? "candidates"
        : type === "Requirement"
          ? "requirements_public"
          : "intake_artifacts";

    try {
      // 1. Exact Content Hash
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      let snapshot = await adminDb
        .collection(collName)
        .where("organizationId", "==", tenantId)
        .where("contentHash", "==", hash)
        .limit(1)
        .get();
        
      if (!snapshot.empty) return true;
      
      if (!extractedEntities) return false;
      
      // Hierarchical checks for Candidates
      if (type === "Resume") {
          // 2. Email
          if (extractedEntities.email) {
              snapshot = await adminDb.collection(collName).where("organizationId", "==", tenantId).where("email", "==", extractedEntities.email).limit(1).get();
              if (!snapshot.empty) return true;
          }
          // 3. Phone
          if (extractedEntities.phone) {
              snapshot = await adminDb.collection(collName).where("organizationId", "==", tenantId).where("phone", "==", extractedEntities.phone).limit(1).get();
              if (!snapshot.empty) return true;
          }
          // 4. LinkedIn
          if (extractedEntities.linkedin) {
              snapshot = await adminDb.collection(collName).where("organizationId", "==", tenantId).where("linkedin", "==", extractedEntities.linkedin).limit(1).get();
              if (!snapshot.empty) return true;
          }
          // 5. Name + Company
          if (extractedEntities.name && extractedEntities.currentCompany) {
              snapshot = await adminDb.collection(collName)
                .where("organizationId", "==", tenantId)
                .where("name", "==", extractedEntities.name)
                .where("currentCompany", "==", extractedEntities.currentCompany)
                .limit(1).get();
              if (!snapshot.empty) return true;
          }
      }

      return false;
    } catch (e) {
      console.error("[DuplicateResolver] Duplicate check failed", e);
      return false;
    }
  }
}
