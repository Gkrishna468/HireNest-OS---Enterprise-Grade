import { db } from "../../../lib/firebase-admin.js";
import { EnterpriseRuntimeKernel } from "./EnterpriseRuntimeKernel.js";

export interface Observation {
  id: string;
  orgId: string;
  office: string;
  targetId: string; // e.g. clientId, candidateId
  eventType: string; // e.g., 'REJECTION', 'INTERVIEW', 'PLACEMENT'
  fact: string; // e.g. 'Missing AWS'
  details: Record<string, any>;
  timestamp: string;
}

export interface Experience {
  id: string;
  orgId: string;
  office: string;
  targetId: string; // e.g. clientId, vendorId
  key: string; // e.g. 'prefers_aws', 'average_response_time'
  value: any; // e.g. true, '18 min'
  weight: number; // learned conclusion priority (0.0 to 1.0)
  observationCount: number;
  updatedAt: string;
}

/**
 * ContinuousImprovementEngine is the only component allowed to evolve the enterprise's long-term intelligence.
 */
export class ContinuousImprovementEngine {
  private static OBSERVATIONS_COLL = "observations";
  private static EXPERIENCES_COLL = "experiences";

  /**
   * Executes analysis on events and telemetry to update knowledge and experience.
   */
  async executeImprovementLoop(orgId: string): Promise<void> {
    console.log(`[Continuous Improvement] Executing loop for ${orgId}`);

    // 1. Process recent observations to evolve Experiences
    const observationsSnapshot = await db
      .collection(ContinuousImprovementEngine.OBSERVATIONS_COLL)
      .where("orgId", "==", orgId)
      .get();

    const observations = observationsSnapshot.docs.map(
      (doc) => doc.data() as Observation,
    );

    // Analyze rejection reasons to synthesize "learned conclusions" (Experiences)
    const clientRejectionReasons: Record<string, Record<string, number>> = {};

    observations.forEach((obs) => {
      if (obs.eventType === "REJECTION" && obs.fact) {
        const clientId = obs.targetId;
        if (!clientRejectionReasons[clientId]) {
          clientRejectionReasons[clientId] = {};
        }
        clientRejectionReasons[clientId][obs.fact] =
          (clientRejectionReasons[clientId][obs.fact] || 0) + 1;
      }
    });

    // Evolve client preferences Experiences based on aggregated rejection counts
    for (const [clientId, facts] of Object.entries(clientRejectionReasons)) {
      const totalRejections = Object.values(facts).reduce((a, b) => a + b, 0);

      for (const [fact, count] of Object.entries(facts)) {
        const calculatedWeight = parseFloat(
          (count / totalRejections).toFixed(2),
        );
        const expId = `exp_${orgId}_${clientId}_prefers_${fact.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

        const expData: Experience = {
          id: expId,
          orgId,
          office: "RecruitmentOffice",
          targetId: clientId,
          key: `prefers_${fact}`,
          value: true,
          weight: calculatedWeight,
          observationCount: count,
          updatedAt: new Date().toISOString(),
        };

        await db
          .collection(ContinuousImprovementEngine.EXPERIENCES_COLL)
          .doc(expId)
          .set(expData);
        console.log(
          `[Continuous Improvement] Synthesized experience: ${expId} with weight ${calculatedWeight}`,
        );
      }
    }

    await EnterpriseRuntimeKernel.event.publish("IMPROVEMENT_CYCLE_COMPLETED", {
      orgId,
    });
  }

  async updateKnowledge(
    orgId: string,
    office: string,
    knowledge: any,
  ): Promise<void> {
    // Controlled update of knowledge memory in office_memory
    await db.collection("office_memory").add({
      orgId,
      office,
      type: "KNOWLEDGE",
      content: knowledge,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Add a raw, immutable observation (immutable facts)
   */
  async logObservation(
    orgId: string,
    office: string,
    targetId: string,
    eventType: string,
    fact: string,
    details: any = {},
  ): Promise<void> {
    const obsId = `obs_${Math.random().toString(36).substr(2, 9)}`;
    const observation: Observation = {
      id: obsId,
      orgId,
      office,
      targetId,
      eventType,
      fact,
      details,
      timestamp: new Date().toISOString(),
    };

    await db
      .collection(ContinuousImprovementEngine.OBSERVATIONS_COLL)
      .doc(obsId)
      .set(observation);
    console.log(
      `[Continuous Improvement] Logged raw observation: ${obsId} for ${targetId}`,
    );

    // Trigger real-time incremental experience evolution
    await this.evolveExperienceIncrementally(
      orgId,
      office,
      targetId,
      eventType,
      fact,
    );
  }

  /**
   * Backward-compatible updateExperience mapping observations and experiences
   */
  async updateExperience(
    orgId: string,
    office: string,
    observationPayload: any,
  ): Promise<void> {
    console.log(
      `[Continuous Improvement] Legacy updateExperience called for ${office} in ${orgId}`,
    );

    // Log as raw observation first
    const targetId = observationPayload.result?.clientId || "GLOBAL";
    const fact = observationPayload.result?.reason || "EventLogged";
    const eventType = observationPayload.result?.eventType || "OBSERVATION";

    await this.logObservation(
      orgId,
      office,
      targetId,
      eventType,
      fact,
      observationPayload,
    );
  }

  private async evolveExperienceIncrementally(
    orgId: string,
    office: string,
    targetId: string,
    eventType: string,
    fact: string,
  ): Promise<void> {
    // Simple incremental weights updates
    const expId = `exp_${orgId}_${targetId}_${eventType.toLowerCase()}_${fact.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const expDoc = await db
      .collection(ContinuousImprovementEngine.EXPERIENCES_COLL)
      .doc(expId)
      .get();

    if (expDoc.exists) {
      const current = expDoc.data() as Experience;
      const newCount = current.observationCount + 1;
      const newWeight = parseFloat(
        Math.min(1.0, current.weight + 0.05).toFixed(2),
      ); // strengthen conclusion weight

      await db
        .collection(ContinuousImprovementEngine.EXPERIENCES_COLL)
        .doc(expId)
        .update({
          observationCount: newCount,
          weight: newWeight,
          updatedAt: new Date().toISOString(),
        });
    } else {
      const initialExp: Experience = {
        id: expId,
        orgId,
        office,
        targetId,
        key: `${eventType.toLowerCase()}_${fact}`,
        value: true,
        weight: 0.5, // start with mid confidence
        observationCount: 1,
        updatedAt: new Date().toISOString(),
      };
      await db
        .collection(ContinuousImprovementEngine.EXPERIENCES_COLL)
        .doc(expId)
        .set(initialExp);
    }
  }

  async getExperiencesForTarget(
    orgId: string,
    targetId: string,
  ): Promise<Experience[]> {
    const snapshot = await db
      .collection(ContinuousImprovementEngine.EXPERIENCES_COLL)
      .where("orgId", "==", orgId)
      .where("targetId", "==", targetId)
      .get();

    return snapshot.docs.map((doc) => doc.data() as Experience);
  }
}
