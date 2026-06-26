import { db } from '../../lib/firebase-admin';

export interface BusinessGraphNode {
    id: string;
    type: 'WORKSPACE' | 'CLIENT' | 'REQUIREMENT' | 'VENDOR' | 'CANDIDATE' | 'SUBMISSION' | 'INTERVIEW' | 'OFFER' | 'INVOICE' | 'REVENUE';
    data: any;
    edges: {
        to: string;
        type: string;
    }[];
}

export interface WorkspaceScope {
    userId: string;
    orgId: string;
    role: string;
    isVendor: boolean;
    isClient: boolean;
    isAdmin: boolean;
}

export class GraphRepository {
    private scope: WorkspaceScope;

    constructor(scope: WorkspaceScope) {
        this.scope = scope;
    }

    async query(collectionName: string, additionalConstraints: any[] = []) {
        if (!db) return [];
        
        let q: FirebaseFirestore.Query = db.collection(collectionName);
        
        // Automatic security filtering based on scope
        if (!this.scope.isAdmin && this.scope.role !== 'hq') {
            if (this.scope.isVendor) {
                // If it's the users collection, we query by orgId, else vendorId
                if (collectionName === 'users') {
                    q = q.where('organizationId', '==', this.scope.orgId);
                } else if (collectionName === 'candidate_matches') {
                    q = q.where('vendorId', '==', this.scope.orgId);
                } else {
                    q = q.where('vendorId', '==', this.scope.orgId);
                }
            } else if (this.scope.isClient) {
                 if (collectionName === 'users') {
                    q = q.where('organizationId', '==', this.scope.orgId);
                } else if (collectionName === 'candidate_matches') {
                    q = q.where('clientId', '==', this.scope.orgId);
                } else {
                    q = q.where('clientId', '==', this.scope.orgId);
                }
            }
        }
        
        // We'd add the additional constraints here in a real implementation
        
        const snap = await q.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
}

/**
 * The BusinessGraphService is the SSOT for resolving relationships between any entities in HireNestOS.
 * It replaces independent, fragmented queries with a unified traversal interface.

 * 
 * It answers questions like:
 * - Which client owns this requirement?
 * - Which vendors received it?
 * - Which candidates are linked?
 * - Which interview is next?
 * - Which invoice belongs to this placement?
 * - What revenue is expected?
 */
export class BusinessGraphService {
    static async getWorkspaceGraph(workspaceId: string): Promise<BusinessGraphNode[]> {
        if (!db) return [];
        // In a real implementation, this would heavily utilize Neo4j or complex Firestore queries.
        // For the current Firestore model, we fetch all interconnected entities.
        
        // This is a foundational stub that will evolve.
        return [];
    }
    
    // Resolve lineage (e.g. from Invoice -> up to Requirement and Candidate)
    static async resolveLineage(entityId: string, entityType: string) {
       if (!db) return null;
       
       const lineage: any = {
           [entityType]: entityId
       };
       
       if (entityType === 'SUBMISSION') {
           const subDoc = await db.collection('submissions').doc(entityId).get();
           if (subDoc.exists) {
               const data = subDoc.data();
               lineage['REQUIREMENT'] = data?.requirementId;
               lineage['CANDIDATE'] = data?.candidateId;
               lineage['VENDOR'] = data?.vendorId;
               
               // Resolve upward to Client via Requirement
               if (data?.requirementId) {
                   const reqDoc = await db.collection('requirements_public').doc(data.requirementId).get();
                   if (reqDoc.exists) {
                       lineage['CLIENT'] = reqDoc.data()?.clientId;
                       lineage['WORKSPACE'] = reqDoc.data()?.workspaceId;
                   }
               }
           }
       } else if (entityType === 'REQUIREMENT') {
           const reqDoc = await db.collection('requirements_public').doc(entityId).get();
           if (reqDoc.exists) {
               lineage['CLIENT'] = reqDoc.data()?.clientId;
               lineage['WORKSPACE'] = reqDoc.data()?.workspaceId;
           }
       } else if (entityType === 'INTERVIEW') {
           const intDoc = await db.collection('interviews').doc(entityId).get();
           if (intDoc.exists) {
               const data = intDoc.data();
               lineage['SUBMISSION'] = data?.submissionId;
               // recursively resolve from submission
               if (data?.submissionId) {
                   const subLineage = await this.resolveLineage(data.submissionId, 'SUBMISSION');
                   Object.assign(lineage, subLineage);
               }
           }
       }
       
       return lineage;
    }

    /**
     * Get all downstream entities for a requirement
     */
    static async getRequirementTree(workspaceId: string, requirementId: string) {
        if (!db) return null;
        
        const reqDoc = await db.collection('requirements_public').doc(requirementId).get();
        const submissionsSnap = await db.collection('submissions').where('requirementId', '==', requirementId).get();
        
        const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Fetch downstream entities based on submissions
        const submissionIds = submissions.map(s => s.id);
        
        let interviews: any[] = [];
        let offers: any[] = [];
        let placements: any[] = [];
        
        if (submissionIds.length > 0) {
            // Firestore 'in' queries are limited to 10 items.
            // For a robust system, we would batch this or use a graph DB.
            const batches = [];
            for (let i = 0; i < submissionIds.length; i += 10) {
                batches.push(submissionIds.slice(i, i + 10));
            }
            
            for (const batch of batches) {
                const intSnap = await db.collection('interviews').where('submissionId', 'in', batch).get();
                interviews = [...interviews, ...intSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
                
                const offerSnap = await db.collection('offers').where('submissionId', 'in', batch).get();
                offers = [...offers, ...offerSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
                
                const placeSnap = await db.collection('placements').where('submissionId', 'in', batch).get();
                placements = [...placements, ...placeSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
            }
        }
        
        return {
            requirement: reqDoc.exists ? reqDoc.data() : null,
            submissions,
            interviews,
            offers,
            placements
        };
    }
}
