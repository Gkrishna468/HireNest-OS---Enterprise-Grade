import { db } from '../../lib/firebase-admin.js';
import { EnterpriseRuntimeKernel } from '../os/kernel/EnterpriseRuntimeKernel.js';

export type NodeType = 'WORKSPACE' | 'CLIENT' | 'VENDOR' | 'REQUIREMENT' | 'CANDIDATE' | 'SUBMISSION' | 'INTERVIEW' | 'OFFER' | 'PLACEMENT' | 'INVOICE' | 'USER';

export interface GraphEvent {
    type: string;
    payload: any;
    timestamp: string;
    actorId: string;
}

export interface GraphRelationship {
    targetId: string;
    type: string;
    metadata?: Record<string, any>;
}

export interface BusinessGraphNode {
    id: string;
    type: NodeType;
    state: string;
    ownerId?: string;
    orgId: string;
    metadata: Record<string, any>;
    history: GraphEvent[];
    relationships: GraphRelationship[];
    createdAt: string;
    updatedAt: string;
}

/**
 * BusinessGraphService is the Single Source of Truth for all business entities.
 * No Office or service should query Firestore directly for business objects.
 */
export class BusinessGraphService {
    private static COLLECTION = 'business_graph';

    static async getNode(id: string): Promise<BusinessGraphNode | null> {
        const doc = await db.collection(this.COLLECTION).doc(id).get();
        return doc.exists ? doc.data() as BusinessGraphNode : null;
    }

    static async createNode(type: NodeType, orgId: string, metadata: any, actorId: string): Promise<BusinessGraphNode> {
        const id = `${type.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`;
        const node: BusinessGraphNode = {
            id,
            type,
            state: 'NEW',
            orgId,
            metadata,
            history: [{
                type: 'CREATED',
                payload: metadata,
                timestamp: new Date().toISOString(),
                actorId
            }],
            relationships: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.collection(this.COLLECTION).doc(id).set(node);
        await EnterpriseRuntimeKernel.audit.logAction('NODE_CREATED', actorId, { nodeId: id, type });
        return node;
    }

    static async transitionState(nodeId: string, newState: string, reason: string, actorId: string): Promise<void> {
        const node = await this.getNode(nodeId);
        if (!node) throw new Error('Node not found');

        const success = await EnterpriseRuntimeKernel.state.transitionState(node.type, node.state, newState);
        if (!success) throw new Error(`Invalid state transition from ${node.state} to ${newState} for ${node.type}`);

        await db.collection(this.COLLECTION).doc(nodeId).update({
            state: newState,
            updatedAt: new Date().toISOString(),
            history: [
                ...node.history,
                {
                    type: 'STATE_TRANSITION',
                    payload: { from: node.state, to: newState, reason },
                    timestamp: new Date().toISOString(),
                    actorId
                }
            ]
        });

        await EnterpriseRuntimeKernel.event.publish('STATE_CHANGED', { nodeId, newState, type: node.type });
    }

    static async addRelationship(sourceId: string, targetId: string, type: string, metadata?: any): Promise<void> {
        const source = await this.getNode(sourceId);
        if (!source) throw new Error('Source node not found');

        await db.collection(this.COLLECTION).doc(sourceId).update({
            relationships: [
                ...source.relationships,
                { targetId, type, metadata }
            ],
            updatedAt: new Date().toISOString()
        });
    }

    static async findByMetadata(orgId: string, type: NodeType, key: string, value: any): Promise<BusinessGraphNode[]> {
        const snapshot = await db.collection(this.COLLECTION)
            .where('orgId', '==', orgId)
            .where('type', '==', type)
            .where(`metadata.${key}`, '==', value)
            .get();
        
        return snapshot.docs.map(doc => doc.data() as BusinessGraphNode);
    }
}
