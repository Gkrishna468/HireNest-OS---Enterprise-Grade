import { IntakeEnvelope } from "./IntakeEnvelope.js";
import { ClassificationResult } from "./EntityClassifier.js";
import { adminDb } from "../../lib/firebase-admin.js";

export class RelationshipBuilder {
    static async build(
        envelope: IntakeEnvelope, 
        classification: ClassificationResult, 
        entities: any[],
        orgContext: { orgId: string | null, type: string }
    ) {
        if (!adminDb) return;

        // Example relationships
        // If a Vendor sends a Resume, link Vendor -> Candidate
        if (orgContext.type === "Vendor" && orgContext.orgId && classification.type === "Resume") {
            for (const entity of entities) {
                if (entity.id && entity.type === "Candidate") {
                    await this.saveRelationship({
                        sourceId: orgContext.orgId,
                        sourceType: "Vendor",
                        targetId: entity.id,
                        targetType: "Candidate",
                        relationshipType: "owns",
                        tenantId: envelope.tenantId
                    });
                }
            }
        }
        
        // If a Client sends a Requirement, link Client -> Requirement
        if (orgContext.type === "Client" && orgContext.orgId && classification.type === "Requirement") {
            for (const entity of entities) {
                if (entity.id && entity.type === "Requirement") {
                    await this.saveRelationship({
                        sourceId: orgContext.orgId,
                        sourceType: "Client",
                        targetId: entity.id,
                        targetType: "Requirement",
                        relationshipType: "belongs_to",
                        tenantId: envelope.tenantId
                    });
                }
            }
        }
    }
    
    private static async saveRelationship(rel: any) {
        try {
            await adminDb.collection("business_graph_edges").add({
                ...rel,
                createdAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("[RelationshipBuilder] Failed to save relationship", e);
        }
    }
}
