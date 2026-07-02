import { adminDb } from "../../lib/firebase-admin.js";
import crypto from "crypto";

export interface DuplicateResult {
    isDuplicate: boolean;
    matchedEntityId?: string;
    matchedEntity?: any;
    confidence?: number;
}

export class DuplicateResolver {
  static async isDuplicate(
    content: string,
    type: string,
    tenantId: string,
    extractedEntities?: any
  ): Promise<DuplicateResult> {
    if (!adminDb || !content) return { isDuplicate: false };

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
        
      if (!snapshot.empty) return { isDuplicate: true, matchedEntityId: snapshot.docs[0].id, matchedEntity: snapshot.docs[0].data(), confidence: 100 };
      
      if (!extractedEntities) return { isDuplicate: false };
      
      // Hierarchical checks for Candidates
      if (type === "Resume") {
          // 2. Email
          if (extractedEntities.email) {
              snapshot = await adminDb.collection(collName).where("organizationId", "==", tenantId).where("email", "==", extractedEntities.email).limit(1).get();
              if (!snapshot.empty) return { isDuplicate: true, matchedEntityId: snapshot.docs[0].id, matchedEntity: snapshot.docs[0].data(), confidence: 95 };
          }
          // 3. Phone
          if (extractedEntities.phone) {
              snapshot = await adminDb.collection(collName).where("organizationId", "==", tenantId).where("phone", "==", extractedEntities.phone).limit(1).get();
              if (!snapshot.empty) return { isDuplicate: true, matchedEntityId: snapshot.docs[0].id, matchedEntity: snapshot.docs[0].data(), confidence: 95 };
          }
          // 4. LinkedIn
          if (extractedEntities.linkedin) {
              snapshot = await adminDb.collection(collName).where("organizationId", "==", tenantId).where("linkedin", "==", extractedEntities.linkedin).limit(1).get();
              if (!snapshot.empty) return { isDuplicate: true, matchedEntityId: snapshot.docs[0].id, matchedEntity: snapshot.docs[0].data(), confidence: 90 };
          }
          // 5. Name + Company
          if (extractedEntities.name && extractedEntities.currentCompany) {
              snapshot = await adminDb.collection(collName)
                .where("organizationId", "==", tenantId)
                .where("name", "==", extractedEntities.name)
                .where("currentCompany", "==", extractedEntities.currentCompany)
                .limit(1).get();
              if (!snapshot.empty) return { isDuplicate: true, matchedEntityId: snapshot.docs[0].id, matchedEntity: snapshot.docs[0].data(), confidence: 85 };
          }
      }

      return { isDuplicate: false };
    } catch (e) {
      console.error("[DuplicateResolver] Duplicate check failed", e);
      return { isDuplicate: false };
    }
  }
}
