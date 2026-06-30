import { db } from "../../../lib/firebase-admin.js";
import { BusinessEvent } from "./RuntimeTypes.js";

export class ReadModels {
  /**
   * Updates specialized read models based on incoming domain events
   */
  static async updateProjections(event: BusinessEvent) {
    if (!db) return;

    try {
      if (
        event.eventType === "REQUIREMENT_CREATED" ||
        event.eventType === "REQUIREMENT_UPDATED"
      ) {
        await this.updateRequirement360(event.payload);
      }
      if (
        event.eventType === "CANDIDATE_CREATED" ||
        event.eventType === "CANDIDATE_UPDATED"
      ) {
        await this.updateCandidate360(event.payload);
      }
      if (event.eventType === "SUBMISSION_CREATED") {
        await this.updateSubmissionIn360s(event.payload);
      }
    } catch (error) {
      console.error("[ReadModels] Projection update failed", error);
      throw error;
    }
  }

  private static async updateRequirement360(payload: any) {
    if (!db || !payload.id) return;
    const ref = db.collection("read_model_requirement360").doc(payload.id);

    // This projection denormalizes client info and stats
    const dataToMerge: any = {
      requirementId: payload.id,
      title: payload.title,
      status: payload.status,
      clientId: payload.clientId,
      updatedAt: new Date().toISOString(),
    };

    if (payload.clientId) {
      const clientDoc = await db
        .collection("clients")
        .doc(payload.clientId)
        .get();
      if (clientDoc.exists) {
        dataToMerge.clientName = clientDoc.data()?.name;
      }
    }

    await ref.set(dataToMerge, { merge: true });
  }

  private static async updateCandidate360(payload: any) {
    if (!db || !payload.id) return;
    const ref = db.collection("read_model_candidate360").doc(payload.id);

    await ref.set(
      {
        candidateId: payload.id,
        name: payload.name,
        status: payload.status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  private static async updateSubmissionIn360s(payload: any) {
    if (!db) return;
    // Denormalize submission count into requirement and candidate 360s
    if (payload.requirementId) {
      const reqRef = db
        .collection("read_model_requirement360")
        .doc(payload.requirementId);
      await db.runTransaction(async (t) => {
        const doc = await t.get(reqRef);
        const currentCount = doc.data()?.totalSubmissions || 0;
        t.set(reqRef, { totalSubmissions: currentCount + 1 }, { merge: true });
      });
    }
  }
}
