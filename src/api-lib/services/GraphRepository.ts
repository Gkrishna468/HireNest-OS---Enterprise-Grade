import { db } from '../../lib/firebase-admin.js';
import { BusinessGraphService, BusinessGraphNode, NodeType } from './BusinessGraphService.js';

/**
 * GraphRepository provides a domain-specific API on top of the BusinessGraphService.
 */
export class GraphRepository {
    static async findCandidateByEmail(orgId: string, email: string): Promise<BusinessGraphNode | null> {
        const results = await BusinessGraphService.findByMetadata(orgId, 'CANDIDATE', 'email', email);
        return results.length > 0 ? results[0] : null;
    }

    static async findRequirementByTitle(orgId: string, title: string): Promise<BusinessGraphNode | null> {
        const results = await BusinessGraphService.findByMetadata(orgId, 'REQUIREMENT', 'title', title);
        return results.length > 0 ? results[0] : null;
    }

    static async createCandidate(orgId: string, data: any, actorId: string): Promise<BusinessGraphNode> {
        const existing = await this.findCandidateByEmail(orgId, data.email);
        if (existing) return existing;

        return await BusinessGraphService.createNode('CANDIDATE', orgId, data, actorId);
    }

    static async createRequirement(orgId: string, data: any, actorId: string): Promise<BusinessGraphNode> {
        const existing = await this.findRequirementByTitle(orgId, data.title);
        if (existing) return existing;

        return await BusinessGraphService.createNode('REQUIREMENT', orgId, data, actorId);
    }

    static async linkCandidateToRequirement(candidateId: string, requirementId: string, metadata: any, actorId: string): Promise<void> {
        await BusinessGraphService.addRelationship(candidateId, requirementId, 'SUBMITTED_TO', metadata);
        await BusinessGraphService.transitionState(candidateId, 'SUBMITTED', 'Applied to requirement', actorId);
    }

    static async getNodesByType(orgId: string, type: NodeType, status?: string): Promise<BusinessGraphNode[]> {
        const snapshot = await db.collection('business_graph')
            .where('orgId', '==', orgId)
            .where('type', '==', type)
            .where('state', '==', status || 'NEW')
            .get();
        
        return snapshot.docs.map(doc => doc.data() as BusinessGraphNode);
    }
}
