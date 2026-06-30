import { db } from "../../../lib/firebase-admin.js";

export interface WorkflowStepDefinition {
  name: string;
  office?: string;
  type: "AUTOMATIC" | "HUMAN" | "GATEWAY";
  compensatingAction?: string;
  nextStep?: string;
  condition?: string; // Evaluated dynamically if GATEWAY
}

export interface WorkflowDefinition {
  workflowName: string;
  version: string;
  steps: Record<string, WorkflowStepDefinition>;
  startStep: string;
}

export class WorkflowRegistry {
  static async getWorkflow(
    workflowName: string,
    version: string = "latest",
  ): Promise<WorkflowDefinition | null> {
    if (!db) return null;
    let snap;
    if (version === "latest") {
      snap = await db
        .collection("workflow_definitions")
        .where("workflowName", "==", workflowName)
        .orderBy("version", "desc")
        .limit(1)
        .get();
    } else {
      snap = await db
        .collection("workflow_definitions")
        .where("workflowName", "==", workflowName)
        .where("version", "==", version)
        .limit(1)
        .get();
    }

    if (snap.empty) return null;
    return snap.docs[0].data() as WorkflowDefinition;
  }

  static async registerWorkflow(def: WorkflowDefinition) {
    if (!db) return;
    await db
      .collection("workflow_definitions")
      .doc(`${def.workflowName}_${def.version}`)
      .set(def);
  }
}
