import { db } from "../../../lib/firebase-admin.js";

export interface GraphNode {
  id: string;
  type:
    | "CLIENT"
    | "REQUIREMENT"
    | "MATCH"
    | "CANDIDATE"
    | "VENDOR"
    | "RECRUITER"
    | "SUBMISSION"
    | "INTERVIEW"
    | "OFFER"
    | "PLACEMENT";
  properties?: any;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relation: string; // e.g., 'HAS_REQUIREMENT', 'MATCHED_TO', 'SUBMITTED_BY', 'SCHEDULED_FOR'
  weight?: number;
  metadata?: any;
}

/**
 * A specialized layer over Firestore to quickly traverse common relationships
 * instead of manually reconstructing them with multiple queries.
 * For now, this is a simulated graph using Firestore collections `business_graph_nodes` and `business_graph_edges`.
 */
export class BusinessGraph {
  static async upsertNode(node: GraphNode) {
    if (!db) return;
    await db
      .collection("business_graph_nodes")
      .doc(node.id)
      .set(node, { merge: true });
  }

  static async link(
    sourceId: string,
    targetId: string,
    relation: string,
    metadata?: any,
  ) {
    if (!db) return;
    const edgeId = `${sourceId}_${relation}_${targetId}`;
    const edge: GraphEdge = {
      sourceId,
      targetId,
      relation,
      metadata,
    };
    await db
      .collection("business_graph_edges")
      .doc(edgeId)
      .set(edge, { merge: true });
  }

  static async getConnectedNodes(
    sourceId: string,
    relation?: string,
  ): Promise<GraphNode[]> {
    if (!db) return [];
    let query = db
      .collection("business_graph_edges")
      .where("sourceId", "==", sourceId);
    if (relation) {
      query = query.where("relation", "==", relation);
    }

    const snap = await query.get();
    if (snap.empty) return [];

    const targetIds = snap.docs.map(
      (doc) => (doc.data() as GraphEdge).targetId,
    );

    // Fetch nodes in batches of 10
    const nodes: GraphNode[] = [];
    for (let i = 0; i < targetIds.length; i += 10) {
      const batchIds = targetIds.slice(i, i + 10);
      const nodesSnap = await db
        .collection("business_graph_nodes")
        .where("id", "in", batchIds)
        .get();
      nodesSnap.docs.forEach((d) => nodes.push(d.data() as GraphNode));
    }

    return nodes;
  }

  static async buildFromEvent(eventType: string, payload: any) {
    // Automatically construct the graph as events flow through the system
    if (eventType === "REQUIREMENT_CREATED") {
      await this.upsertNode({
        id: payload.id,
        type: "REQUIREMENT",
        properties: { title: payload.title },
      });
      if (payload.clientId) {
        await this.upsertNode({ id: payload.clientId, type: "CLIENT" });
        await this.link(payload.clientId, payload.id, "HAS_REQUIREMENT");
      }
    }

    if (eventType === "CANDIDATE_CREATED") {
      await this.upsertNode({
        id: payload.id,
        type: "CANDIDATE",
        properties: { name: payload.name },
      });
    }

    if (eventType === "MATCH_CREATED") {
      await this.upsertNode({ id: payload.matchId, type: "MATCH" });
      await this.link(payload.requirementId, payload.matchId, "HAS_MATCH");
      await this.link(payload.candidateId, payload.matchId, "IS_MATCHED");
    }

    if (eventType === "SUBMISSION_CREATED") {
      await this.upsertNode({ id: payload.submissionId, type: "SUBMISSION" });
      await this.link(
        payload.candidateId,
        payload.submissionId,
        "SUBMITTED_AS",
      );
      await this.link(
        payload.requirementId,
        payload.submissionId,
        "SUBMITTED_FOR",
      );
      if (payload.vendorId) {
        await this.upsertNode({ id: payload.vendorId, type: "VENDOR" });
        await this.link(payload.vendorId, payload.submissionId, "PROVIDED_BY");
      }
    }

    // More mappings could be added...
  }
}
