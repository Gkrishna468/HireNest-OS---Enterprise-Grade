import { db } from "../../../lib/firebase-admin.js";
import {
  BusinessEvent,
  WorkflowInstance,
  WorkflowState,
  WorkflowStep,
  HumanTask,
} from "./RuntimeTypes.js";
import { EventBus } from "../../services/EventBus.js";

export class WorkflowEngine {
  /**
   * Start a new workflow instance
   */
  static async startWorkflow(
    name: string,
    tenantId: string,
    entityId: string,
    entityType: string,
    context: any,
    correlationId: string,
  ): Promise<string> {
    if (!db) return "";

    const workflowId = `wf-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const instance: WorkflowInstance = {
      workflowId,
      name,
      tenantId,
      entityId,
      entityType,
      state: "RUNNING",
      currentStepId: "", // To be updated when step starts
      context,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      correlationId,
    };

    await db.collection("workflow_instances").doc(workflowId).set(instance);
    return workflowId;
  }

  /**
   * Start a workflow step
   */
  static async startStep(
    workflowId: string,
    stepName: string,
    office?: string,
    humanTaskRequired?: boolean,
    compensatingAction?: string,
  ): Promise<string> {
    if (!db) return "";

    const stepId = `step-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const step: WorkflowStep = {
      stepId,
      workflowId,
      name: stepName,
      status: "RUNNING",
      office,
      humanTaskRequired,
      compensatingAction,
      startedAt: new Date().toISOString(),
    };

    const batch = db.batch();
    batch.set(db.collection("workflow_steps").doc(stepId), step);
    batch.update(db.collection("workflow_instances").doc(workflowId), {
      currentStepId: stepId,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
    return stepId;
  }

  /**
   * Complete a step
   */
  static async completeStep(
    stepId: string,
    workflowId: string,
    contextUpdates?: any,
  ) {
    if (!db) return;

    const batch = db.batch();
    batch.update(db.collection("workflow_steps").doc(stepId), {
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
    });

    if (contextUpdates) {
      batch.set(
        db.collection("workflow_instances").doc(workflowId),
        {
          context: contextUpdates,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }

    await batch.commit();
  }

  /**
   * Fail a step, triggering compensation (Saga)
   */
  static async failStep(stepId: string, workflowId: string, error: string) {
    if (!db) return;

    // 1. Mark step as FAILED
    await db.collection("workflow_steps").doc(stepId).update({
      status: "FAILED",
      error,
      completedAt: new Date().toISOString(),
    });

    // 2. Mark workflow as COMPENSATING
    await db.collection("workflow_instances").doc(workflowId).update({
      state: "COMPENSATING",
      updatedAt: new Date().toISOString(),
    });

    // 3. Trigger Compensation Actions (Sagas)
    await this.triggerCompensation(workflowId);
  }

  /**
   * Triggers compensation actions in reverse order of completed steps.
   */
  private static async triggerCompensation(workflowId: string) {
    if (!db) return;

    const stepsSnap = await db
      .collection("workflow_steps")
      .where("workflowId", "==", workflowId)
      .where("status", "==", "COMPLETED")
      .get();

    // Sort by startedAt desc (reverse order)
    const steps = stepsSnap.docs
      .map((d) => d.data() as WorkflowStep)
      .sort((a, b) => {
        return (
          new Date(b.startedAt || "").getTime() -
          new Date(a.startedAt || "").getTime()
        );
      });

    for (const step of steps) {
      if (step.compensatingAction) {
        const instanceSnap = await db
          .collection("workflow_instances")
          .doc(workflowId)
          .get();
        const instance = instanceSnap.data() as WorkflowInstance;

        await EventBus.publish(
          step.compensatingAction,
          {
            workflowId,
            stepId: step.stepId,
            context: instance.context,
          },
          "WorkflowEngine",
          instance.tenantId,
          {
            correlationId: instance.correlationId,
            traceId: `COMPENSATE-${workflowId}`,
          },
        );

        await db.collection("workflow_steps").doc(step.stepId).update({
          status: "COMPENSATED",
        });
      }
    }

    await db.collection("workflow_instances").doc(workflowId).update({
      state: "FAILED", // Final state after compensation
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Complete Workflow
   */
  static async completeWorkflow(workflowId: string) {
    if (!db) return;
    await db.collection("workflow_instances").doc(workflowId).update({
      state: "COMPLETED",
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Create a Human Task
   */
  static async createHumanTask(
    workflowId: string,
    stepId: string,
    tenantId: string,
    assignedTo: string,
    context: any,
    dueDate?: string,
  ) {
    if (!db) return;

    const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const task: HumanTask = {
      taskId,
      workflowId,
      stepId,
      tenantId,
      assignedTo,
      dueDate,
      status: "PENDING",
      context,
      createdAt: new Date().toISOString(),
    };

    await db.collection("human_tasks").doc(taskId).set(task);

    // Pause workflow step
    await db.collection("workflow_instances").doc(workflowId).update({
      state: "WAITING",
      updatedAt: new Date().toISOString(),
    });

    return taskId;
  }

  /**
   * Resolve a Human Task
   */
  static async resolveHumanTask(
    taskId: string,
    status: "APPROVED" | "REJECTED" | "ESCALATED",
    updateContext?: any,
  ) {
    if (!db) return;

    const taskSnap = await db.collection("human_tasks").doc(taskId).get();
    if (!taskSnap.exists) return;

    const task = taskSnap.data() as HumanTask;

    const batch = db.batch();
    batch.update(taskSnap.ref, {
      status,
      resolvedAt: new Date().toISOString(),
    });

    const instanceRef = db
      .collection("workflow_instances")
      .doc(task.workflowId);

    if (status === "APPROVED") {
      batch.update(instanceRef, {
        state: "RUNNING",
        updatedAt: new Date().toISOString(),
        ...(updateContext ? { context: updateContext } : {}),
      });
    } else if (status === "REJECTED") {
      batch.update(instanceRef, {
        state: "FAILED",
        updatedAt: new Date().toISOString(),
      });
      // Let the caller or a trigger handle Saga compensation if they want to call failStep.
    }

    await batch.commit();
  }
}
